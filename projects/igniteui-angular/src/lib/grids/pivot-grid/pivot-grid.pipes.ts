import { Inject, Pipe, PipeTransform } from '@angular/core';
import { cloneArray } from '../../core/utils';
import { DataUtil } from '../../data-operations/data-util';
import { FilteringExpressionsTree, IFilteringExpressionsTree } from '../../data-operations/filtering-expressions-tree';
import { IFilteringStrategy } from '../../data-operations/filtering-strategy';
import { DEFAULT_PIVOT_KEYS, IPivotConfiguration, IPivotDimension, IPivotGridRecord, IPivotKeys, PivotDimensionType } from './pivot-grid.interface';
import {
    DefaultPivotSortingStrategy, DimensionValuesFilteringStrategy, PivotColumnDimensionsStrategy,
    PivotRowDimensionsStrategy
} from '../../data-operations/pivot-strategy';
import { PivotUtil } from './pivot-util';
import { FilteringLogic } from '../../data-operations/filtering-expression.interface';
import { ISortingExpression, SortingDirection } from '../../data-operations/sorting-strategy';
import { GridType, IGX_GRID_BASE } from '../common/grid.interface';
import { GridBaseAPIService } from '../api.service';
import { IgxGridBaseDirective } from '../grid-base.directive';
import { IGridSortingStrategy } from '../common/strategy';
import { IGroupByResult } from '../../data-operations/grouping-result.interface';
import { IGroupingExpression } from '../../data-operations/grouping-expression.interface';

/**
 * @hidden
 */
@Pipe({
    name: 'pivotGridRow',
    pure: true
})
export class IgxPivotRowPipe implements PipeTransform {

    constructor() { }

    public transform(
        collection: any,
        config: IPivotConfiguration,
        _: Map<any, boolean>,
        _pipeTrigger?: number,
        __?
    ): IPivotGridRecord[] {
        const pivotKeys = config.pivotKeys || DEFAULT_PIVOT_KEYS;
        const enabledRows = config.rows.filter(x => x.enabled);
        const rowStrategy = config.rowStrategy || PivotRowDimensionsStrategy.instance();
        const data = cloneArray(collection, true);
        return rowStrategy.process(data, enabledRows, config.values, pivotKeys);
    }
}

/**
 * @hidden
 */
@Pipe({
    name: 'pivotGridRowExpansion',
    pure: true
})
export class IgxPivotRowExpansionPipe implements PipeTransform {

    constructor(@Inject(IGX_GRID_BASE) private grid?: GridType) { }

    public transform(
        collection: IPivotGridRecord[],
        config: IPivotConfiguration,
        expansionStates: Map<any, boolean>,
        defaultExpand: boolean,
        _pipeTrigger?: number,
        __?,
    ): IPivotGridRecord[] {
        const pivotKeys = config.pivotKeys || DEFAULT_PIVOT_KEYS;
        const enabledRows = config.rows.filter(x => x.enabled);
        let data = collection ? cloneArray(collection, true) : [];
        let totalLlv = 0;
        const prevDims = [];
        for (const row of enabledRows) {
            const lvl = PivotUtil.getDimensionDepth(row);
            totalLlv += lvl;
            data = PivotUtil.flattenHierarchy(data, config, row, expansionStates, defaultExpand);
            prevDims.push(row);
        }
        if (this.grid) {
            this.grid.setFilteredSortedData(data, false);
        }
        return data;
    }
}

/**
 * @hidden
 */
@Pipe({
    name: 'pivotGridCellMerging',
    pure: true
})
export class IgxPivotCellMergingPipe implements PipeTransform {
    constructor(@Inject(IGX_GRID_BASE) private grid: GridType) { }
    public transform(
        collection: any[],
        config: IPivotConfiguration,
        dim: IPivotDimension,
        pivotKeys: IPivotKeys,
        _pipeTrigger?: number
    ): any[] {
        if (collection.length === 0 || config.rows.length === 0) return collection;
        const data = collection ? cloneArray(collection, true) : [];
        const res = [];

        const enabledRows = config.rows.filter(x => x.enabled);

        const prevDims = enabledRows.filter((d, ind) => ind < enabledRows.indexOf(dim));
        let groupData = [];
        let prevDim;
        let prevDimRoot;
        let prevId;
        for (let rec of data) {
            const dimData = PivotUtil.getDimensionLevel(dim, rec, pivotKeys);
            const id = PivotUtil.getRecordKey(rec, dimData.dimension);
            if (groupData.length > 0 && prevId !== id) {
                const h = groupData.length > 1 ? groupData.length * this.grid.renderedRowHeight : undefined;
                groupData[0][prevDimRoot.memberName + pivotKeys.rowDimensionSeparator + 'height'] = h;
                groupData[0][prevDim.dimension.memberName + pivotKeys.rowDimensionSeparator + 'rowSpan'] = groupData.length;
                res.push(groupData[0]);
                groupData = [];
            }
            groupData.push(rec);
            prevDim = dimData;
            prevDimRoot = dim;
            prevId = id;
        }
        if (groupData.length > 0) {
            const h = groupData.length > 1 ? groupData.length * this.grid.rowHeight + (groupData.length - 1) + 1 : undefined;
            groupData[0][prevDimRoot.memberName + pivotKeys.rowDimensionSeparator + 'height'] = h;
            groupData[0][prevDim.dimension.memberName + pivotKeys.rowDimensionSeparator + 'rowSpan'] = groupData.length;
            res.push(groupData[0]);
        }
        return res;
    }
}


/**
 * @hidden
 */
@Pipe({
    name: 'pivotGridColumn',
    pure: true
})
export class IgxPivotColumnPipe implements PipeTransform {

    public transform(
        collection: IPivotGridRecord[],
        config: IPivotConfiguration,
        _: Map<any, boolean>,
        _pipeTrigger?: number,
        __?
    ): IPivotGridRecord[] {
        const pivotKeys = config.pivotKeys || DEFAULT_PIVOT_KEYS;
        const enabledColumns = config.columns.filter(x => x.enabled);
        const enabledValues = config.values.filter(x => x.enabled);

        const colStrategy = config.columnStrategy || PivotColumnDimensionsStrategy.instance();
        const data = cloneArray(collection, true);
        return colStrategy.process(data, enabledColumns, enabledValues, pivotKeys);
    }
}

/**
 * @hidden
 */
@Pipe({
    name: 'pivotGridFilter',
    pure: true
})
export class IgxPivotGridFilterPipe implements PipeTransform {
    constructor(private gridAPI: GridBaseAPIService<IgxGridBaseDirective & GridType>) { }
    public transform(collection: any[],
        config: IPivotConfiguration,
        filterStrategy: IFilteringStrategy,
        advancedExpressionsTree: IFilteringExpressionsTree,
        _filterPipeTrigger: number,
        _pipeTrigger: number): any[] {
        const expressionsTree = PivotUtil.buildExpressionTree(config);

        const state = {
            expressionsTree,
            strategy: filterStrategy || new DimensionValuesFilteringStrategy(),
            advancedExpressionsTree
        };

        if (FilteringExpressionsTree.empty(state.expressionsTree) && FilteringExpressionsTree.empty(state.advancedExpressionsTree)) {
            return collection;
        }

        const result = DataUtil.filter(cloneArray(collection, true), state, this.gridAPI.grid);

        return result;
    }
}


/**
 * @hidden
 */
@Pipe({
    name: 'pivotGridColumnSort',
    pure: true
})
export class IgxPivotGridColumnSortingPipe implements PipeTransform {
    public transform(
        collection: IPivotGridRecord[],
        expressions: ISortingExpression[],
        sorting: IGridSortingStrategy,
        pipeTrigger: number,
        pivotKeys: IPivotKeys = DEFAULT_PIVOT_KEYS
    ): IPivotGridRecord[] {
        let result: IPivotGridRecord[];

        if (!expressions.length) {
            result = collection;
        } else {
            // TODO - update to work with IPivotGridRecord
            result = PivotUtil.sort(cloneArray(collection, true), expressions, sorting, pivotKeys);
        }
        return result;
    }
}

/**
 * @hidden
 */
@Pipe({
    name: 'pivotGridSort',
    pure: true
})
export class IgxPivotGridSortingPipe implements PipeTransform {
    constructor(private gridAPI: GridBaseAPIService<IgxGridBaseDirective & GridType>) { }
    public transform(collection: any[], config: IPivotConfiguration, sorting: IGridSortingStrategy,
        id: string, pipeTrigger: number, pinned?): any[] {
        let result: any[];
        const allDimensions = config.rows;
        const enabledDimensions = allDimensions.filter(x => x && x.enabled);
        const expressions: ISortingExpression[] = [];
        PivotUtil.flatten(enabledDimensions).forEach(x => {
            if (x.sortDirection) {
                expressions.push({
                    dir: x.sortDirection,
                    fieldName: x.memberName,
                    strategy: DefaultPivotSortingStrategy.instance()
                });
            } else {
                expressions.push({
                    dir: SortingDirection.None,
                    fieldName: x.memberName,
                    strategy: DefaultPivotSortingStrategy.instance()
                });
            }
        });
        if (!expressions.length) {
            result = collection;
        } else {
            result = DataUtil.sort(cloneArray(collection, true), expressions, sorting, this.gridAPI.grid);
        }

        return result;
    }
}

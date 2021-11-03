import {
    AfterContentInit,
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ComponentFactoryResolver,
    ElementRef,
    forwardRef,
    HostBinding,
    Inject,
    Input,
    IterableDiffers,
    LOCALE_ID,
    NgZone,
    OnInit,
    Optional,
    QueryList,
    TemplateRef,
    ViewChild,
    ViewChildren,
    ViewContainerRef
} from '@angular/core';
import { IgxGridBaseDirective } from '../grid-base.directive';
import { GridBaseAPIService } from '../api.service';
import { IgxFilteringService } from '../filtering/grid-filtering.service';
import { IgxGridSelectionService } from '../selection/selection.service';
import { IgxForOfSyncService, IgxForOfScrollSyncService } from '../../directives/for-of/for_of.sync.service';
import { GridType } from '../common/grid.interface';
import { IgxGridNavigationService } from '../grid-navigation.service';
import { IgxGridCRUDService } from '../common/crud.service';
import { IgxGridSummaryService } from '../summaries/grid-summary.service';
import { IPivotConfiguration, IPivotDimension, IPivotKeys, PivotDimensionType } from './pivot-grid.interface';
import { IgxPivotHeaderRowComponent } from './pivot-header-row.component';
import { IgxColumnGroupComponent } from '../columns/column-group.component';
import { IgxColumnComponent } from '../columns/column.component';
import { PivotUtil } from './pivot-util';
import { DimensionValuesFilteringStrategy, NoopPivotDimensionsStrategy } from '../../data-operations/pivot-strategy';
import { IgxGridExcelStyleFilteringComponent } from '../filtering/excel-style/grid.excel-style-filtering.component';
import { IgxPivotGridNavigationService } from './pivot-grid-navigation.service';
import { IgxColumnResizingService } from '../resizing/resizing.service';
import { IgxFlatTransactionFactory, IgxOverlayService, State, Transaction, TransactionService } from '../../services/public_api';
import { DOCUMENT } from '@angular/common';
import { DisplayDensityToken, IDisplayDensityOptions } from '../../core/displayDensity';
import { cloneArray, PlatformUtil } from '../../core/utils';
import { IgxGridTransaction } from '../hierarchical-grid/public_api';
import { IgxPivotFilteringService } from './pivot-filtering.service';
import { DataUtil } from '../../data-operations/data-util';
import { IFilteringExpressionsTree } from '../../data-operations/filtering-expressions-tree';

let NEXT_ID = 0;
const MINIMUM_COLUMN_WIDTH = 200;
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    preserveWhitespaces: false,
    selector: 'igx-pivot-grid',
    templateUrl: 'pivot-grid.component.html',
    providers: [
        IgxGridCRUDService,
        IgxGridSummaryService,
        IgxGridSelectionService,
        GridBaseAPIService,
        { provide: IgxGridBaseDirective, useExisting: forwardRef(() => IgxPivotGridComponent) },
        { provide: IgxFilteringService, useClass: IgxPivotFilteringService },
        IgxPivotGridNavigationService,
        IgxForOfSyncService,
        IgxForOfScrollSyncService
    ]
})
export class IgxPivotGridComponent extends IgxGridBaseDirective implements OnInit, AfterContentInit,
    GridType, AfterViewInit {

    /** @hidden @internal */
    @ViewChild(IgxPivotHeaderRowComponent, { static: true })
    public theadRow: IgxPivotHeaderRowComponent;



    @Input()
    /**
     * Gets/Sets the pivot configuration with all related dimensions and values.
     *
     * @example
     * ```html
     * <igx-pivot-grid [pivotConfiguration]="config"></igx-pivot-grid>
     * ```
     */
    public pivotConfiguration: IPivotConfiguration = { rows: null, columns: null, values: null, filters: null };

    /**
     * @hidden @internal
     */
    @HostBinding('attr.role')
    public role = 'grid';

    /**
     * @hidden @internal
     */
    @ViewChild('record_template', { read: TemplateRef, static: true })
    public recordTemplate: TemplateRef<any>;

    /**
     * @hidden @internal
     */
    @ViewChild('headerTemplate', { read: TemplateRef, static: true })
    public headerTemplate: TemplateRef<any>;

    /**
     * @hidden @internal
     */
    @ViewChildren(IgxGridExcelStyleFilteringComponent, { read: IgxGridExcelStyleFilteringComponent })
    public excelStyleFilteringComponents: QueryList<IgxGridExcelStyleFilteringComponent>;


    public columnGroupStates = new Map<string, boolean>();
    public dimensionDataColumns;
    public pivotKeys: IPivotKeys = {aggregations: 'aggregations', records: 'records', children: 'children', level: 'level'};
    public isPivot = true;
    protected _defaultExpandState = true;
    private _data;
    private _filteredData;
    private p_id = `igx-pivot-grid-${NEXT_ID++}`;


    constructor(
        public selectionService: IgxGridSelectionService,
        public colResizingService: IgxColumnResizingService,
        gridAPI: GridBaseAPIService<IgxGridBaseDirective & GridType>,
        protected transactionFactory: IgxFlatTransactionFactory,
        elementRef: ElementRef,
        zone: NgZone,
        @Inject(DOCUMENT) public document,
        cdr: ChangeDetectorRef,
        resolver: ComponentFactoryResolver,
        differs: IterableDiffers,
        viewRef: ViewContainerRef,
        navigation: IgxPivotGridNavigationService,
        filteringService: IgxFilteringService,
        @Inject(IgxOverlayService) protected overlayService: IgxOverlayService,
        public summaryService: IgxGridSummaryService,
        @Optional() @Inject(DisplayDensityToken) protected _displayDensityOptions: IDisplayDensityOptions,
        @Inject(LOCALE_ID) localeId: string,
        protected platform: PlatformUtil,
        @Optional() @Inject(IgxGridTransaction) protected _diTransactions?: TransactionService<Transaction, State>) {
        super(
            selectionService,
            colResizingService,
            gridAPI,
            transactionFactory,
            elementRef,
            zone,
            document,
            cdr,
            resolver,
            differs,
            viewRef,
            navigation,
            filteringService,
            overlayService,
            summaryService,
            _displayDensityOptions,
            localeId,
            platform);
    }

    /**
     * @hidden
     */
    public ngOnInit() {
        // pivot grid always generates columns automatically.
        this.autoGenerate = true;
        this.uniqueColumnValuesStrategy = this.uniqueColumnValuesStrategy || this.uniqueDimensionValuesStrategy;
        super.ngOnInit();
    }

    /**
     * @hidden
     */
    public ngAfterContentInit() {
        // ignore any user defined columns and auto-generate based on pivot config.
        this.columnList.reset([]);
        Promise.resolve().then(() => {
            this.setupColumns();
        });
    }

    public ngAfterViewInit() {
        Promise.resolve().then(() => {
            super.ngAfterViewInit();
        });
    }

    public uniqueDimensionValuesStrategy(column: IgxColumnComponent, exprTree: IFilteringExpressionsTree,
        done: (uniqueValues: any[]) => void) {
        const config = this.pivotConfiguration;
        const allDimensions = config.rows.concat(config.columns).concat(config.filters).filter(x => x !== null);
        const enabledDimensions = allDimensions.filter(x => x && x.enabled);
        const dim = PivotUtil.flatten(enabledDimensions).find(x => x.memberName === column.field);
        this.getDimensionData(dim, exprTree, uniqueValues => done(uniqueValues));
    }

    public getDimensionData(dim: IPivotDimension,
        dimExprTree: IFilteringExpressionsTree,
        done: (colVals: any[]) => void) {
            let columnValues = [];
            const data = this.gridAPI.get_data();
            const state = {
                expressionsTree: dimExprTree,
                strategy: this.filterStrategy || new DimensionValuesFilteringStrategy(),
                advancedFilteringExpressionsTree: this.advancedFilteringExpressionsTree
            };
            const filtered = DataUtil.filter(data, state, this);
            const allValuesHierarchy = PivotUtil.getFieldsHierarchy(
                filtered,
                [dim],
                PivotDimensionType.Column,
                {aggregations: 'aggregations', records: 'records', children: 'children', level: 'level'}
                );
            const flatData = Array.from(allValuesHierarchy.values());
            columnValues = flatData.map(record => this.extractValue(record['value']));
            done(columnValues);
            return;
    }

    /** @hidden */
    public featureColumnsWidth() {
        return this.pivotRowWidths;
    }

    /**
     * Gets/Sets the value of the `id` attribute.
     *
     * @remarks
     * If not provided it will be automatically generated.
     * @example
     * ```html
     * <igx-pivot-grid [id]="'igx-pivot-1'" [data]="Data"></igx-pivot-grid>
     * ```
     */
    @HostBinding('attr.id')
    @Input()
    public get id(): string {
        return this.p_id;
    }
    public set id(value: string) {
        this.p_id = value;
    }

    /**
     * An @Input property that lets you fill the `IgxPivotGridComponent` with an array of data.
     * ```html
     * <igx-pivot-grid [data]="Data"></igx-pivot-grid>
     * ```
     */
    @Input()
    public set data(value: any[] | null) {
        this._data = value || [];
        if (this.shouldGenerate) {
            this.setupColumns();
            this.reflow();
        }
        this.cdr.markForCheck();
        if (this.height === null || this.height.indexOf('%') !== -1) {
            // If the height will change based on how much data there is, recalculate sizes in igxForOf.
            this.notifyChanges(true);
        }
    }

    /**
     * Returns an array of data set to the component.
     * ```typescript
     * let data = this.grid.data;
     * ```
     */
    public get data(): any[] | null {
        return this._data;
    }
    /**
     * Sets an array of objects containing the filtered data.
     * ```typescript
     * this.grid.filteredData = [{
     *       ID: 1,
     *       Name: "A"
     * }];
     * ```
     */
    public set filteredData(value) {
        this._filteredData = value;
    }

    /**
     * Returns an array of objects containing the filtered data.
     * ```typescript
     * let filteredData = this.grid.filteredData;
     * ```
     *
     * @memberof IgxHierarchicalGridComponent
     */
    public get filteredData() {
        return this._filteredData;
    }


    /**
     * @hidden
     */
    public getContext(rowData, rowIndex): any {
        return {
            $implicit: rowData,
            templateID: {
                type: 'dataRow',
                id: null
            },
            index: this.getDataViewIndex(rowIndex, false)
        };
    }

    public get pivotRowWidths() {
        const rowDimCount = this.rowDimensions.length;
        return MINIMUM_COLUMN_WIDTH * rowDimCount || MINIMUM_COLUMN_WIDTH;
    }

    public get rowDimensions() {
        return this.pivotConfiguration.rows.filter(x => x.enabled) || [];
    }

    public get columnDimensions() {
        return this.pivotConfiguration.columns.filter(x => x.enabled) || [];
    }

    public get filterDimensions() {
        return this.pivotConfiguration.filters?.filter(x => x.enabled) || [];
    }

    public get values() {
        return this.pivotConfiguration.values.filter(x => x.enabled);
    }

    public toggleColumn(col: IgxColumnComponent) {
        const state = this.columnGroupStates.get(col.field);
        const newState = !state;
        this.columnGroupStates.set(col.field, newState);
        this.toggleGroup(col, newState);
        this.reflow();
    }

    protected toggleGroup(col: IgxColumnComponent, newState: boolean) {
        if (this.hasMultipleValues) {
            const fieldColumns = col.children.filter(x => !x.columnGroup);
            const groupColumns = col.children.filter(x => x.columnGroup);
            groupColumns.forEach(groupColumn => {
                groupColumn.hidden = newState;
                this.resolveToggle(groupColumn);
            });
            fieldColumns.forEach(fieldColumn => {
                fieldColumn.hidden = !newState;
            });
        } else {
            const parentCols = col.parent ? col.parent.children : this.columns.filter(x => x.level === 0);
            const fieldColumn = parentCols.filter(x => x.header === col.header && !x.columnGroup)[0];
            const groupColumn = parentCols.filter(x => x.header === col.header && x.columnGroup)[0];
            groupColumn.hidden = newState;
            this.resolveToggle(groupColumn);
            fieldColumn.hidden = !newState;
            if (newState) {
                fieldColumn.headerTemplate = this.headerTemplate;
            } else {
                fieldColumn.headerTemplate = undefined;
            }
        }
    }

    protected resolveToggle(groupColumn: IgxColumnComponent) {
        const hasChildGroup = groupColumn.children.filter(x => x.columnGroup).length > 0;
        if (!groupColumn.hidden && hasChildGroup) {
            const fieldChildren = groupColumn.children.filter(x => !x.columnGroup);
            const groupChildren = groupColumn.children.filter(x => x.columnGroup);
            groupChildren.forEach(group => {
                this.resolveToggle(group);
            });
            fieldChildren.forEach(fieldChild => {
                fieldChild.hidden = true;
            });
        }
    }

    /**
     * @hidden
     * @internal
     */
    protected calcGridHeadRow() {
    }

    protected get hasMultipleValues() {
        return this.values.length > 1;
    }

    /**
     * @hidden
     */
     protected autogenerateColumns() {
         let columns = [];
         const data = this.gridAPI.get_data();
         this.dimensionDataColumns = this.generateDimensionColumns();
         let fieldsMap;
         if (this.pivotConfiguration.columnStrategy && this.pivotConfiguration.columnStrategy instanceof NoopPivotDimensionsStrategy) {
            const fields = this.generateDataFields(data);
            const rowFields = PivotUtil.flatten(this.pivotConfiguration.rows).map(x => x.memberName);
            const keyFields = Object.values(this.pivotKeys);
            const filteredFields = fields.filter(x => rowFields.indexOf(x) === -1 && keyFields.indexOf(x) === -1 &&
                x.indexOf('_level') === -1 && x.indexOf('_records') === -1);
            fieldsMap = this.generateFromData(filteredFields);
        } else {
            fieldsMap = PivotUtil.getFieldsHierarchy(
            data,
            this.columnDimensions,
            PivotDimensionType.Column,
            {aggregations: 'aggregations', records: 'records', children: 'children', level: 'level'}
            );
        }
        columns = this.generateColumnHierarchy(fieldsMap, data);
        this._autoGeneratedCols = columns;

        this.columnList.reset(columns);
        if (data && data.length > 0) {
            this.shouldGenerate = false;
        }
    }

    protected generateDimensionColumns() {
        const config = this.pivotConfiguration;
        const allDimensions = config.rows.concat(config.columns).concat(config.filters).filter(x => x !== null);
        const leafFields = PivotUtil.flatten(allDimensions, 0).filter(x => !x.childLevel).map(x => x.memberName);
        const columns = [];
        const factory = this.resolver.resolveComponentFactory(IgxColumnComponent);
        leafFields.forEach((field) => {
            const ref = factory.create(this.viewRef.injector);
            ref.instance.field = field;
            ref.changeDetectorRef.detectChanges();
            columns.push(ref.instance);
        });
        return columns;
    }

    protected generateFromData(fields: string[]) {
        const dataArr = fields.map(x => x.split('-')).sort(x => x.length);
        const hierarchy = new Map<string, any>();
        dataArr.forEach(arr => {
            let currentHierarchy = hierarchy;
            const path = [];
            for (const val of arr) {
                path.push(val);
                let h = currentHierarchy.get(path.join('-'));
                if (!h) {
                    currentHierarchy.set(path.join('-'), { expandable: true, children: new Map<string, any>() });
                    h = currentHierarchy.get(path.join('-'));
                }
                currentHierarchy = h.children;
            }
        });
        return hierarchy;
    }

    protected generateColumnHierarchy(fields: Map<string, any>, data, parent = null): IgxColumnComponent[] {
        const factoryColumn = this.resolver.resolveComponentFactory(IgxColumnComponent);
        const factoryColumnGroup = this.resolver.resolveComponentFactory(IgxColumnGroupComponent);
        let columns = [];
        fields.forEach((value, key) => {
            let shouldGenerate = true;
            if (value.dimension && value.dimension.filters) {
                const state = {
                    expressionsTree: value.dimension.filters.filteringOperands[0],
                    strategy: this.filterStrategy || new DimensionValuesFilteringStrategy(),
                    advancedFilteringExpressionsTree: this.advancedFilteringExpressionsTree
                };
                const filtered = DataUtil.filter(cloneArray(value.records), state, this);
                if (filtered.length === 0) {
                    shouldGenerate = false;
                }
            }
            if (shouldGenerate && (value.children == null || value.children.length === 0 || value.children.size === 0)) {
                const ref = this.hasMultipleValues ?
                    factoryColumnGroup.create(this.viewRef.injector) :
                    factoryColumn.create(this.viewRef.injector);
                ref.instance.header = parent != null ? key.split(parent.header + '-')[1] : key;
                ref.instance.field = key;
                ref.instance.parent = parent;
                ref.instance.dataType = this.pivotConfiguration.values[0]?.dataType || this.resolveDataTypes(data[0][key]);
                ref.instance.formatter = this.pivotConfiguration.values[0]?.formatter;
                ref.changeDetectorRef.detectChanges();
                columns.push(ref.instance);
                if (this.hasMultipleValues) {
                    const measureChildren = this.getMeasureChildren(factoryColumn, data, ref.instance, false);
                    ref.instance.children.reset(measureChildren);
                    columns = columns.concat(measureChildren);
                }

            } else if(shouldGenerate) {
                const ref = factoryColumnGroup.create(this.viewRef.injector);
                ref.instance.parent = parent;
                ref.instance.field = key;
                ref.instance.header = parent != null ? key.split(parent.header + '-')[1] : key;
                if (value.expandable) {
                    ref.instance.headerTemplate = this.headerTemplate;
                }
                if (!this.hasMultipleValues) {
                    const refSibling = factoryColumn.create(this.viewRef.injector);
                    refSibling.instance.header = parent != null ? key.split(parent.header + '-')[1] : key;
                    refSibling.instance.field = key;
                    refSibling.instance.parent = parent;
                    refSibling.instance.hidden = true;
                    refSibling.instance.dataType = this.pivotConfiguration.values[0]?.dataType || this.resolveDataTypes(data[0][key]);
                    refSibling.instance.formatter = this.pivotConfiguration.values[0]?.formatter;
                    columns.push(refSibling.instance);
                }
                const children = this.generateColumnHierarchy(value.children, data, ref.instance);
                const filteredChildren = children.filter(x => x.level === ref.instance.level + 1);
                ref.changeDetectorRef.detectChanges();
                columns.push(ref.instance);
                if (this.hasMultipleValues) {
                    const measureChildren = this.getMeasureChildren(factoryColumn, data, ref.instance, true);
                    const nestedChildren = filteredChildren.concat(measureChildren);
                    const allChildren = children.concat(measureChildren);
                    ref.instance.children.reset(nestedChildren);
                    columns = columns.concat(allChildren);
                } else {
                    ref.instance.children.reset(filteredChildren);
                    columns = columns.concat(children);
                }
            }
        });
        this.reflow();
        return columns;
    }

    protected getMeasureChildren(colFactory, data, parent, hidden) {
        const cols = [];
        this.values.forEach(val => {
            const ref = colFactory.create(this.viewRef.injector);
            ref.instance.header = val.displayName || val.member;
            ref.instance.field = parent.field + '-' + val.member;
            ref.instance.parent = parent;
            ref.instance.hidden = hidden;
            ref.instance.dataType = val.dataType || this.resolveDataTypes(data[0][val.member]);
            ref.instance.formatter = val.formatter;
            ref.changeDetectorRef.detectChanges();
            cols.push(ref.instance);
        });
        return cols;
    }
    private extractValue(value) {
        return value.split('-')[value.split('-').length - 1];
    }
}

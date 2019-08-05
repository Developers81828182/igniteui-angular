'use strict';

const autoprefixer = require('autoprefixer');
const browserSync = require('browser-sync').create();
const del = require('del');
const gulp = require('gulp');
const concat = require('gulp-concat');
const sass = require('gulp-sass');
const shell = require('gulp-shell');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const process = require('process');
const fs = require('fs');
const argv = require('yargs').argv;
const sassdoc = require('sassdoc');
const ts = require('gulp-typescript');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const typedocGulp = require('igniteui-typedoc-theme/gulpfile');
const { series, parallel } = require('gulp');

sass.compiler = require('sass');

const STYLES = {
    SRC: './projects/igniteui-angular/src/lib/core/styles/themes/presets/*',
    DIST: './dist/igniteui-angular/styles',
    MAPS: './maps',
    THEMING: {
        SRC: './projects/igniteui-angular/src/lib/core/styles/**/*',
        DIST: './dist/igniteui-angular/lib/core/styles'
    },
    CONFIG: {
        outputStyle: 'compressed'
    }
};

const TYPEDOC_THEME = {
    SRC: `${path.join(__dirname, "node_modules", "igniteui_typedoc_theme", "typedoc", "src")}`,
    // DIST: './extras/docs/themes/typedoc/bin/',
    // STYLES: {
    //     ENTRY: './assets/css/main.sass',
    //     OUT: './assets/css',
    //     MAPS: './',
    //     CONFIG: {
    //         outputStyle: 'compressed'
    //     }
    // }
}

// gulp.task('build-style', () => {
//     const prefixer = postcss([autoprefixer({
//         browsers: ['last 5 versions', '> 3%'],
//         cascade: false,
//         grid: true
//     })]);

//     gulp.src(STYLES.THEMING.SRC)
//         .pipe(gulp.dest(STYLES.THEMING.DIST));

//     const myEventEmitter = new EventEmitter();

//     return gulp.src(STYLES.SRC)
//         .pipe(sourcemaps.init())
//         .pipe(sass.sync(STYLES.CONFIG).on('error', err => {
//             sass.logError.bind(myEventEmitter)(err);
//             myEventEmitter.emit('end');
//             process.exit(1);
//         }))
//         .pipe(prefixer)
//         .pipe(sourcemaps.write(STYLES.MAPS))
//         .pipe(gulp.dest(STYLES.DIST))
// });

// gulp.task('copy-git-hooks', () => {

//     if (process.env.AZURE_PIPELINES || process.env.TRAVIS || process.env.CI || !fs.existsSync('.git')) {
//         return;
//     }

//     const gitHooksDir = './.git/hooks/';
//     const defaultCopyHookDir = gitHooksDir + 'scripts/';
//     const dirs = [
//         gitHooksDir,
//         defaultCopyHookDir,
//         defaultCopyHookDir + 'templates',
//         defaultCopyHookDir + 'templateValidators',
//         defaultCopyHookDir + 'utils'
//     ];

//     dirs.forEach((dir) => {
//         if (!fs.existsSync(dir)) {
//             fs.mkdir(dir, (err) => {
//                 if (err) {
//                     throw err;
//                 }
//             });
//         }
//     });

//     const defaultHookDir = './.hooks/scripts/';

//     fs.copyFileSync(defaultHookDir + 'templates/default.js',
//         defaultCopyHookDir + 'templates/default.js');

//     fs.copyFileSync(defaultHookDir + 'templateValidators/default-style-validator.js',
//         defaultCopyHookDir + 'templateValidators/default-style-validator.js');

//     fs.copyFileSync(defaultHookDir + 'utils/issue-validator.js',
//         defaultCopyHookDir + 'utils/issue-validator.js');

//     fs.copyFileSync(defaultHookDir + 'utils/line-limits.js',
//         defaultCopyHookDir + 'utils/line-limits.js');

//     fs.copyFileSync(defaultHookDir + 'common.js',
//         defaultCopyHookDir + 'common.js');

//     fs.copyFileSync(defaultHookDir + 'validate.js',
//         defaultCopyHookDir + 'validate.js');

//     fs.copyFileSync('./.hooks/prepare-commit-msg',
//         './.git/hooks/prepare-commit-msg');
// });

// gulp.task('copy-migrations', () => {
//     return gulp.src([
//         './projects/igniteui-angular/migrations/**/*.json',
//         '!**/tsconfig.json'
//     ])
//         .pipe(gulp.dest('./dist/igniteui-angular/migrations'));
// });

// gulp.task('copy-schematics', () => {
//     return gulp.src([
//         './projects/igniteui-angular/schematics/**/*.json',
//         '!**/tsconfig.json'
//     ])
//         .pipe(gulp.dest('./dist/igniteui-angular/schematics'));
// });

// gulp.task('typedoc-styles', ['typedoc:clean-styles'], () => {
//     const prefixer = postcss([autoprefixer({
//         browsers: ['last 5 versions', '> 3%'],
//         cascade: false,
//         grid: false
//     })]);

//     return gulp.src(`${TYPEDOC_THEME.SRC}/${TYPEDOC_THEME.STYLES.ENTRY}`)
//         .pipe(sourcemaps.init())
//         .pipe(sass.sync(TYPEDOC_THEME.STYLES.CONFIG).on('error', sass.logError))
//         .pipe(prefixer)
//         .pipe(sourcemaps.write(TYPEDOC_THEME.STYLES.MAPS))
//         .pipe(gulp.dest(`${TYPEDOC_THEME.DIST}/${TYPEDOC_THEME.STYLES.OUT}`))
// });

// gulp.task('typedoc-ts',
//     shell.task('tsc --project ./extras/docs/themes/typedoc/tsconfig.json')
// );

// gulp.task('typedoc-js', ['typedoc:clean-js', 'typedoc-ts'], () => {
//     gulp.src([
//         `${TYPEDOC_THEME.SRC}/assets/js/lib/jquery-2.1.1.min.js`,
//         `${TYPEDOC_THEME.SRC}/assets/js/lib/underscore-1.6.0.min.js`,
//         `${TYPEDOC_THEME.SRC}/assets/js/lib/backbone-1.1.2.min.js`,
//         `${TYPEDOC_THEME.SRC}/assets/js/lib/lunr.min.js`,
//         `${TYPEDOC_THEME.SRC}/assets/js/src/navigation/igviewer.common.js`,
//         `${TYPEDOC_THEME.SRC}/assets/js/src/navigation/igviewer.renderingService.js`,
//         `${TYPEDOC_THEME.SRC}/assets/js/src/navigation/nav-initializer.js`,
//         `${TYPEDOC_THEME.SRC}/assets/js/src/versioning/tag-versions.req.js`,
//         `${TYPEDOC_THEME.SRC}/assets/js/main.js`
//     ])
//         .pipe(concat('main.js'))
//         .pipe(gulp.dest(`${TYPEDOC_THEME.DIST}/assets/js/`));
// });

// gulp.task('typedoc-theme-ts', () => {
//     gulp.src([
//         `${path.join(TYPEDOC_THEME.SRC, "assets", "js", "src", "theme.ts")}`
//     ])
//         .pipe(ts({
//             target: "es2017",
//             moduleResolution: 'node',
//             module: 'commonjs'
//         }))
//         .pipe(gulp.dest(TYPEDOC_THEME.DIST));
// });

// gulp.task('typedoc-copy-config', () => {
//     const themePath = path.join(__dirname, "extras", "docs", "themes", "config.json");
//     gulp.src([themePath])
//         .pipe(gulp.dest(TYPEDOC_THEME.DIST));
// });

// gulp.task('typedoc-images', ['typedoc:clean-images'], () => {
//     return gulp.src(`${TYPEDOC_THEME.SRC}/assets/images/**/*.{png,gif,jpg,svg}`)
//         .pipe(gulp.dest(`${TYPEDOC_THEME.DIST}/assets/images`));
// });

// gulp.task('typedoc-hbs', ['typedoc:clean-hbs'], () => {
//     return gulp.src([
//         `${TYPEDOC_THEME.SRC}/layouts/**/*`,
//         `${TYPEDOC_THEME.SRC}/partials/**/*`,
//         `${TYPEDOC_THEME.SRC}/templates/**/*`,
//     ], {
//             base: `${TYPEDOC_THEME.SRC}`
//         })
//         .pipe(gulp.dest(`${TYPEDOC_THEME.DIST}`));
// });

// gulp.task('typedoc:clean-theme-js', () => {
//     del.sync(`${TYPEDOC_THEME.DIST}/theme.js`)
// })

// gulp.task('typedoc:clean-js', ['typedoc:clean-theme-js'], () => {
//     del.sync(`${TYPEDOC_THEME.DIST}/assets/js`);
// });

// gulp.task('typedoc:clean-styles', () => {
//     del.sync(`${TYPEDOC_THEME.DIST}/assets/css`);
// });

// gulp.task('typedoc:clean-config', () => {
//     del.sync(`${TYPEDOC_THEME.DIST}/config.json`)
// })

// gulp.task('typedoc:clean-images', () => {
//     del.sync(`${TYPEDOC_THEME.DIST}/assets/images`);
// });

// gulp.task('typedoc:clean-hbs', ['typedoc:clean-config'], () => {
//     del.sync([
//         `${TYPEDOC_THEME.DIST}/layouts`,
//         `${TYPEDOC_THEME.DIST}/partials`,
//         `${TYPEDOC_THEME.DIST}/templates`
//     ]);
// });

// function typedocWatch() {

// }
// gulp.task('typedoc-watch', ['typedoc-build:theme'], () => {
//     return gulp.watch([
//         `${TYPEDOC_THEME.SRC}/assets/js/src/**/*.{ts,js}`,
//         `${TYPEDOC_THEME.SRC}/assets/css/**/*.{scss,sass}`,
//         `${TYPEDOC_THEME.SRC}/**/*.hbs`,
//         `${TYPEDOC_THEME.SRC}/assets/images/**/*.{png,jpg,gif}`,
//     ], ['typedoc-build:theme']);
// });

async function buildTheme() {
   return await shell.task(`typedoc ${TYPEDOC.PROJECT_PATH}`);
}

function typedocWatch() {
   return gulp.watch([
        `${TYPEDOC_THEME.SRC}/assets/js/src/**/*.{ts,js}`,
        `${TYPEDOC_THEME.SRC}/assets/css/**/*.{scss,sass}`,
        `${TYPEDOC_THEME.SRC}/**/*.hbs`,
        `${TYPEDOC_THEME.SRC}/assets/images/**/*.{png,jpg,gif}`]);
}

// async function build() {
//     return await typedocGulp.typedocBuild();
// }

// gulp.task('typedoc-build', typedocGulp.typedocBuild);
module.exports.testGen = parallel(buildTheme);
module.exports.testdoc = parallel(typedocGulp.typedocBuild, buildTheme, typedocWatch, typedocGulp.typedocBuild, buildTheme);

// gulp.task('typedoc-build', [
//     'typedoc-images',
//     'typedoc-hbs',
//     'typedoc-styles',
//     'typedoc-js',
//     'typedoc-theme-ts',
//     'typedoc-copy-config'
// ]);

// const SASSDOC_THEME = {
//     JS_DIR: path.join(__dirname, 'extras', 'docs', 'themes', 'sassdoc', 'assets', 'js'),
//     TYPESCRIPT_DIR: path.join(__dirname, 'extras', 'docs', 'themes', 'sassdoc', 'typescript')
// }

// gulp.task('sassdoc-clear-main', () => {
//     del.sync(`${SASSDOC_THEME.JS_DIR}/main.js`);
//     del.sync(`${SASSDOC_THEME.JS_DIR}/main.d.ts`);
// });

// gulp.task('sassdoc-ts',
//     shell.task('tsc --project ./extras/docs/themes/sassdoc/tsconfig.json')
// );

// gulp.task('sassdoc-js', ['sassdoc-ts'], () => {
//     gulp.src([
//         `${SASSDOC_THEME.JS_DIR}/**/!(tag-versions.req)*.js`,
//     ])
//         .pipe(concat('main.js'))
//         .pipe(gulp.dest(SASSDOC_THEME.JS_DIR));
// })

// gulp.task('sassdoc-build', [
//     'sassdoc-clear-main',
//     'sassdoc-js'
// ])

// const DOCS_OUTPUT_PATH = path.join(__dirname, 'dist', 'igniteui-angular', 'docs');

const TYPEDOC = {
    EXPORT_JSON_PATH: path.join('dist', 'igniteui-angular', 'docs', 'typescript-exported'),
    PROJECT_PATH: path.join(__dirname, 'projects', 'igniteui-angular', 'src'),
    TEMPLATE_STRINGS_PATH: path.join(__dirname, 'extras', 'template', 'strings', 'shell-strings.json')
}

// gulp.task('typedoc-build:theme', ['typedoc-build'],
//     shell.task(`typedoc ${TYPEDOC.PROJECT_PATH}`)
// );

// gulp.task('typedoc-build:export',
//     shell.task(`typedoc ${TYPEDOC.PROJECT_PATH} --generate-json ${TYPEDOC.EXPORT_JSON_PATH} --tags --params`)
// );

// gulp.task('typedoc-build:import', ['typedoc-build'],
//     shell.task(`typedoc ${TYPEDOC.PROJECT_PATH} --generate-from-json ${TYPEDOC.EXPORT_JSON_PATH}`)
// );

// gulp.task('create:docs-output-path', () => {
//     !fs.existsSync(DOCS_OUTPUT_PATH) && fs.mkdirSync(DOCS_OUTPUT_PATH);
// });

// gulp.task('typedoc:clean-docs-dir', () => {
//     del.sync(`${DOCS_OUTPUT_PATH}typescript`)
// });

// gulp.task('typedoc-build:doc:ja:localization', ['typedoc-build', 'create:docs-output-path', 'typedoc:clean-docs-dir'],
//     shell.task(`typedoc ${TYPEDOC.PROJECT_PATH} --generate-from-json ${path.join(__dirname, 'i18nRepo', 'typedoc', 'ja')} --templateStrings ${TYPEDOC.TEMPLATE_STRINGS_PATH} --localize jp`)
// );

// gulp.task('typedoc-build:doc:en:localization', ['typedoc-build', 'create:docs-output-path', 'typedoc:clean-docs-dir'],
//     shell.task(`typedoc ${TYPEDOC.PROJECT_PATH} --localize en`)
// );

// const SASSDOC = {
//     PROJECT_PATH: path.join(__dirname, 'projects', 'igniteui-angular', 'src', 'lib', 'core', 'styles'),
//     DEST: path.join(__dirname, 'dist', 'igniteui-angular', 'docs', 'sass'),
//     OPTIONS: path.join(__dirname, '.sassdocrc'),
// }

// gulp.task('sassdoc:clean-docs-dir', () => {
//     del.sync(SASSDOC.DEST);
// });

// gulp.task('sassdoc-build:export', () => {
//     const options = JSON.parse(fs.readFileSync(SASSDOC.OPTIONS, 'utf8'));
//     options.convert = argv.convert;

//     return gulp.src(`${SASSDOC.PROJECT_PATH}/**/*.scss`)
//         .pipe(sassdoc(options));
// });

// gulp.task('sassdoc-build:import', () => {
//     const options = JSON.parse(fs.readFileSync(SASSDOC.OPTIONS, 'utf8'));
//     options.render = argv.render;

//     return gulp.src(`${SASSDOC.PROJECT_PATH}/**/*.scss`)
//         .pipe(sassdoc(options))
// });

// gulp.task('sassdoc-build:doc:ja:localizaiton', ['sassdoc-build', 'sassdoc:clean-docs-dir'], () => {
//     const pathTranslations = path.join(__dirname, 'i18nRepo', 'sassdoc', 'ja');
//     const options = JSON.parse(fs.readFileSync(SASSDOC.OPTIONS, 'utf8'));

//     options.lang = 'jp';
//     options.render = argv.render;
//     options.json_dir = pathTranslations;

//     return gulp.src(`${SASSDOC.PROJECT_PATH}/**/*.scss`)
//         .pipe(sassdoc(options));
// });

// gulp.task('sassdoc-build:doc:en:localizaiton', ['sassdoc-build', 'sassdoc:clean-docs-dir'], () => {
//     const options = JSON.parse(fs.readFileSync(SASSDOC.OPTIONS, 'utf8'));

//     options.lang = 'en';

//     return gulp.src(`${SASSDOC.PROJECT_PATH}/**/*.scss`)
//         .pipe(sassdoc(options));
// });

// gulp.task('typedoc-serve', ['typedoc-watch'], () => {
//     browserSync.init({
//         server: './dist/igniteui-angular/docs/typescript'
//     });

//     gulp.watch('./dist/igniteui-angular/docs/typescript/**/*')
//         .on('change', browserSync.reload);
// });

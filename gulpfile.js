var gulp = require('gulp'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    ghPages = require('gulp-gh-pages'),
    browserSync = require('browser-sync');



/**
 * Process Sass
 */
gulp.task('styles', function(){
    gulp.src('./assets/styles/main.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer())
        .pipe(gulp.dest('./build'))
        .pipe(browserSync.stream());
});




/**
 * Concat and compress JS
 */
gulp.task('scripts', function(){
    gulp.src('./assets/scripts/*')
        .pipe(concat('app.js'))
        // .pipe(uglify())
        .pipe(gulp.dest('./build'))
        .pipe(browserSync.stream());
});




/**
 * Concat and compress JS
 */
gulp.task('scripts:vendor', function(){
    gulp.src('./assets/scripts/vendor/*')
        .pipe(gulp.dest('./build'))
        .pipe(browserSync.stream());
});





/**
 * HTML to build
 */
gulp.task('html', function(){
    gulp.src('./index.html')
        .pipe(gulp.dest('./build'))
        .pipe(browserSync.stream());
});




/**
 * Static Server
 */
gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./build"
        }
    });
});





gulp.task('deploy', function() {
    return gulp.src('./build/**/*')
        .pipe(ghPages());
});




gulp.task('watch', ['browser-sync'], function(){
    gulp.watch('assets/styles/**/*', ['styles']);
    gulp.watch('assets/scripts/**/*', ['scripts']);
    gulp.watch('assets/scripts/vendor/*', ['scripts:vendor']);
    gulp.watch('./index.html', ['html']);
});
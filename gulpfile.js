var gulp = require('gulp'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    ghPages = require('gulp-gh-pages');



/**
 * Process Sass
 */
gulp.task('styles', function(){
    gulp.src('./assets/styles/main.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer())
        .pipe(gulp.dest('./build'));
});




/**
 * Concat and compress JS
 */
gulp.task('scripts', function(){
    gulp.src('./assets/scripts/**/*')
        .pipe(concat('app.js'))
        // .pipe(uglify())
        .pipe(gulp.dest('./build'));
});




/**
 * HTML to build
 */
gulp.task('html', function(){
    gulp.src('./index.html')
        .pipe(gulp.dest('./build'));
});




gulp.task('deploy', function() {
    return gulp.src('./build/**/*')
        .pipe(ghPages());
});




gulp.task('watch', function(){
    gulp.watch('assets/styles/**/*', ['styles']);
    gulp.watch('assets/scripts/**/*', ['scripts']);
    gulp.watch('./index.html', ['html']);
});
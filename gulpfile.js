'use strict';

var gulp = require('gulp'),
    concat = require('gulp-concat'),
    sass = require('gulp-sass'),
    minifyCss = require('gulp-minify-css'),
    uglify = require('gulp-uglify');


gulp.task('js', function () {
    return gulp.src([
        './bower_components/svg.js/dist/svg.js',


        'resources/js/**.js',
        'resources/js/*/**.js',
    ])
        .pipe(concat('app.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./js'));
});


gulp.task('sass', function () {
    return gulp.src('./resources/sass/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(minifyCss())
        .pipe(gulp.dest('./css'));
});


gulp.task('watch', function () {
    return gulp.watch('resources/**', ['sass', 'js']);
});


gulp.task('default', [ 'sass', 'js']);
'use strict';

var animateRequestFrame,
    audioAPI = function () {

        this.properties = {
            analyser: undefined,
            audioContext: undefined,
            barWidth: 2,
            sound: undefined,
            svg: {
                currentPosition: null,
                currentTime: null,
                element: null,
                visualizer: null,
                visualizerCircles: [],
                visualizerTotals: 8
            },
            size: 600,
            totalBars: 386
        };

        this.sound = undefined;

        /**
         * init
         */
        this.init = function () {
            if (this.supportRequestAnimateFrame() || this.supportAudioContext()) {
                this.properties.audioContext = new AudioContext();

                this.eventsBind();
            } else {
                console.log('Not Support AnimateFrame');
            }
        };

        /**
         * animate frame rate method
         */
        this.animateFrame = function () {
            var fbc_array = new Uint8Array(this.properties.analyser.frequencyBinCount);
            this.properties.analyser.getByteFrequencyData(fbc_array);

            var percentSoundTime = (this.properties.sound.currentTime / this.properties.sound.duration) * 100;

            this.animateCurrentSound(percentSoundTime);
            this.animateVisualyzer(fbc_array);

            animateRequestFrame = requestAnimationFrame(this.animateFrame.bind(this));
        };


        this.animateCurrentSound = function (percent) {
            if (!percent) return false;

            var currentPosition = (percent / 100) * (this.properties.size * 2);

            if (currentPosition != null) {
                this.properties.svg.currentPosition.attr({'stroke-dashoffset': (this.properties.size * 2) - currentPosition});
                this.labelTimesAudio();

                //stop
                if (currentPosition == 100)
                    this.stopSound();
            }
        };

        this.animateVisualyzer = function (frequency) {
            var totalItems = Math.PI * 2 / this.properties.svg.visualizerCircles.length;

            for (var i = 0; i < this.properties.svg.visualizerCircles.length; i++) {
                if (i != 0) {
                    var angle = i * totalItems,
                        cx = Math.sin(angle) * 110,
                        cy = Math.cos(angle) * 110;

                    var x = Math.sin(frequency[i] / 2),
                        y = Math.cos(frequency[i] / 2),
                        radiusX = this.maxMinNumber(0, frequency[i] / 2 - Math.floor(Math.random() * 20), frequency[i] / 2 - Math.floor(Math.random() * 20)),
                        radiusY = frequency[i] / 2;

                    //var y = Math.cos(frequency[i] / 2) - Math.floor(Math.random() * 5); secundary

                    //var height = Math.floor(Math.random() * this.maxMinNumber(80, frequency[i] / 1.8, frequency[i] / 1.8)); secundary

                    this.properties.svg.visualizerCircles[i].attr({rx: radiusX, ry: radiusY, cx: cx - x, cy: cy - y});
                }
            }
        };

        this.barCircleTrack = function (channel, total, group, radius, color) {
            var angleTotals = Math.PI * 2 / this.properties.totalBars,
                eachBlock = total / this.properties.totalBars;

            for (var i = 0; i < this.properties.totalBars; i++) {
                var audioBuffKey = Math.floor(eachBlock * i),
                    heightElement = channel[audioBuffKey] < 0 ? 10 : channel[audioBuffKey] * 150,
                    angle = i * angleTotals;

                var x = Math.cos(angle) * radius + this.properties.size,
                    y = Math.sin(angle) * radius + this.properties.size / 2;

                this.createBarTracking(this.properties.barWidth, heightElement, x, y, angle, group, i, color);
            }

            return group;
        };

        this.bufferTracking = function (buffer) {
            var leftChannel = buffer.getChannelData(0);

            if (leftChannel.length > 0) {
                if (this.properties.svg.element != null) {
                    this.properties.svg.element.remove();
                }

                this.properties.svg.element = SVG('music').size(this.properties.size, this.properties.size);

                //create circle tracking
                this.createCircleTracking(leftChannel, leftChannel.length, '#e7e7e7', true);
                this.properties.svg.currentPosition = this.createCircleTracking(leftChannel, leftChannel.length, '#4e4e4f');

                this.properties.svg.currentPosition.attr({
                    'stroke-dasharray': this.properties.size * 2,
                    'stroke-dashoffset': this.properties.size * 2
                });

                return true;
            } else {
                return false;
            }
        };

        this.createBarTracking = function (width, height, x, y, angle, group, index, color) {
            if (!width || !height || !angle || !group && typeof x == 'number' && typeof y == 'number') return false;

            var rect = this.properties.svg.element.rect(width, height);

            rect.attr({fill: color});

            rect.attr({x: 0, y: 0, index: index})
                .translate(x, y - height / 2)
                .rotate(angle * (180 / Math.PI) + 90);

            rect.attr('height', 0).animate(10 * index).attr('height', height);

            if (typeof group == 'object') {
                group.add(rect);
            }
        };

        this.createCircleTracking = function (channel, total, color) {
            if (!channel || !total) return false;

            var radius = (this.properties.size / 2),
                group = this.properties.svg.element.group(),
                masking = this.properties.svg.element.circle(radius + 66);

            group.rotate(-90, (this.properties.size / 2) + (radius / 2), (this.properties.size / 2) + (radius / 2));

            masking.attr({
                'fill': 'none',
                'stroke': '#FFF',
                'stroke-width': 40,
                cx: this.properties.size + 1,
                cy: this.properties.size / 2
            });

            var circleBars = this.barCircleTrack(channel, total, group, radius - 100, color);

            if (circleBars != false) {

                group.on('click', function (event) {
                    if (typeof event.target.getAttribute('index') != 'number') {
                        this.selectTime(event.target.getAttribute('index'));
                    }
                }, this);

                group.maskWith(masking);

                return masking;
            }
        };

        this.decodeAudioData = function (file) {
            var fileReader = new FileReader;

            fileReader.onload = function (event) {
                var arrayBuffer = event.target.result;

                this.properties.audioContext.decodeAudioData(arrayBuffer,
                    function (buffer) {
                        if (this.bufferTracking(buffer) && buffer) {
                            this.infoAudio(file.files[0]);
                        } else {
                            console.log('error');
                        }
                    }.bind(this), function (error) {
                        console.log('error', error);
                        return false;
                    }.bind(this));
            }.bind(this);

            fileReader.readAsArrayBuffer(file.files[0]);

            return URL.createObjectURL(file.files[0]);
        };

        this.eventsBind = function () {
            document.getElementById('play').addEventListener('click', function () {
                this.playSound();
            }.bind(this), false);

            document.getElementById('stop').addEventListener('click', function () {
                this.stopSound();
            }.bind(this), false);

            document.querySelector('input').addEventListener('change', function (event) {
                this.loadSound(event);
            }.bind(this), false);
        };

        /**
         * get time in hours : minutes : seconds
         * @param seconds
         * @returns {*}
         */
        this.getTime = function (seconds) {
            if (!seconds) return '0:00';

            var duration = moment.duration(seconds, 'seconds'),
                seconds = duration.seconds() < 10 ? '0' + duration.seconds() : duration.seconds(),
                totalTime = '';

            if (duration.hours() > 0) {
                totalTime = duration.hours() + ":";
            }

            return totalTime + duration.minutes() + ":" + seconds;
        };

        this.infoAudio = function (file) {
            if (file) {
                var name = this.properties.svg.element.text(file.name),
                    type = this.properties.svg.element.text(file.type);

                name.attr({x: this.properties.size / 2, y: 10});
                type.attr({x: this.properties.size / 2, y: 40});

                this.labelTimesAudio();
            }
        };

        /**
         * label time audio
         */
        this.labelTimesAudio = function () {
            var current = this.getTime(this.properties.sound.currentTime),
                totalTime = this.getTime(this.properties.sound.duration);

            if (this.properties.svg.currentTime != null)
                this.properties.svg.currentTime.remove();

            this.properties.svg.currentTime = this.properties.svg.element.text(current + ' - ' + totalTime);
        };

        this.maxMinNumber = function (min, max, number) {
            if (typeof number != 'number') return false;

            return Math.max(min, Math.min(number, max));
        };

        this.loadSound = function (event) {
            this.properties.sound = new Audio();
            this.properties.sound.src = this.decodeAudioData(event.target);

            this.sound = this.properties.audioContext.createMediaElementSource(this.properties.sound);
            this.properties.analyser = this.properties.audioContext.createAnalyser();
        };

        this.playSound = function () {
            if (this.properties.sound && typeof this.properties.sound == 'object') {

                this.properties.sound.play();
                this.sound.connect(this.properties.analyser);
                this.properties.analyser.connect(this.properties.audioContext.destination);

                this.visualizer();

                animateRequestFrame = requestAnimationFrame(this.animateFrame.bind(this));
            }
        };

        this.selectTime = function (index) {
            if (!index) return false;

            var percent = Math.floor((index * (180 / Math.PI) / 360) * 100),
                time = (percent / 100) * this.properties.sound.duration;

            console.log(percent.toPrecision(6), time.toPrecision(6), this.properties.sound.duration);

            this.properties.sound.currentTime = time.toPrecision(6);
        };

        this.stopSound = function () {
            if (this.properties.sound && typeof this.properties.sound == 'object') {

                this.properties.sound.pause();
                this.sound.disconnect(this.properties.analyser);
                this.properties.analyser.disconnect(this.properties.audioContext.destination);

                this.visualizerDestroy();

                window.cancelAnimationFrame(animateRequestFrame);
            }
        };

        /**
         * support audio context
         * @returns {boolean}
         */
        this.supportAudioContext = function () {
            window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

            return !window.AudioContext ? false : true;
        };

        /**
         * support request animate
         * @returns {boolean}
         */
        this.supportRequestAnimateFrame = function () {
            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

            window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

            return !window.requestAnimationFrame || !window.cancelAnimationFrame ? false : true;
        };


        this.visualizer = function () {
            if (this.properties.svg.visualizer == null) {
                var mask = this.properties.svg.element.circle(515);
                mask.attr({
                    'fill': 'none',
                    'stroke': '#FFF',
                    'stroke-width': 100,
                    cx: 0,
                    cy: 0
                });

                this.properties.svg.visualizer = this.properties.svg.element.group();
                this.properties.svg.visualizer
                    .style({filter: 'url("#fancy-goo")'})
                    .translate(this.properties.size / 2, this.properties.size / 2);

                var totalItemsAngle = Math.PI * 2 / this.properties.svg.visualizerTotals;

                for (var i = 0; i < this.properties.svg.visualizerTotals; i++) {
                    if (i != 0) {
                        var angle = (i * totalItemsAngle) * Math.floor(Math.PI * 180 / Math.random()),
                            x = Math.sin(angle) * this.properties.size / 3,
                            y = Math.cos(angle) * this.properties.size / 3;

                        var ellipse = this.properties.svg.element.ellipse(100, 100);
                        ellipse.radius(100, 100).attr({fill: '#989ca6', cx: x, cy: y});

                        this.properties.svg.visualizerCircles.push(ellipse);
                        this.properties.svg.visualizer.add(ellipse);
                    } else {
                        var ellipse = this.properties.svg.element.ellipse(100, 100);
                        ellipse.radius(210, 210).attr({fill: '#989ca6', cx: 0, cy: 0});

                        this.properties.svg.visualizerCircles.push(ellipse);
                        this.properties.svg.visualizer.add(ellipse);
                    }
                }

                this.properties.svg.visualizer.maskWith(mask);
            } else {
                this.visualizerDestroy();
            }
        };

        this.visualizerDestroy = function () {
            if (this.properties.svg.visualizer != null) {
                this.properties.svg.visualizer.remove();

                this.properties.svg.visualizer = null;
                this.properties.svg.visualizerCircles = [];
            }
        };
    };

var app = new audioAPI();
app.init();

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
                element: null,
                visualizer: null,
                visualizerCircles: []
            },
            size: 600,
            totalBars: 336
        };

        this.sound = undefined;

        this.init = function () {
            console.log('init');
            if (this.supportRequestAnimateFrame() || this.supportAudioContext()) {
                this.properties.audioContext = new AudioContext();

                this.eventsBind();
            } else {
                console.log('Not Support AnimateFrame');
            }
        };

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

            if (currentPosition != null)
                this.properties.svg.currentPosition.attr({'stroke-dashoffset': (this.properties.size * 2) - currentPosition});
        };

        this.animateVisualyzer = function (frequency) {
            var totalItems = Math.PI * 2 / this.properties.svg.visualizerCircles.length;

            //frequency
            for (var i = 0; i < this.properties.svg.visualizerCircles.length; i++) {
                if(i != 0) {
                    var angle = i * totalItems,
                        cx = Math.sin(angle) * 100,
                        cy = Math.cos(angle) * 100;

                    var x = Math.sin(frequency[i] / 2) - Math.floor(Math.random() * 5);
                    var y = Math.cos(frequency[i] / 2) - Math.floor(Math.random() * 5);
                    //var y = Math.cos(frequency[i] / 2) - Math.floor(Math.random() * 5); secundary

                    var height = frequency[i] / 1.8;
                    //var height = Math.floor(Math.random() * this.maxMinNumber(80, frequency[i] / 1.8, frequency[i] / 1.8)); secundary

                    this.properties.svg.visualizerCircles[i].attr({r: height, cx: cx - x, cy: cy - y});
                }
            }
        };

        this.barCircleTrack = function (channel, total, group, radius, color) {
            var angleTotals = Math.PI * 2 / this.properties.totalBars,
                eachBlock = Math.floor(total / this.properties.totalBars);

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
                this.createCircleTracking(leftChannel, leftChannel.length, '#EBE');
                this.properties.svg.currentPosition = this.createCircleTracking(leftChannel, leftChannel.length, '#010');

                this.properties.svg.currentPosition.attr({
                    'stroke-dasharray': this.properties.size * 2,
                    'stroke-dashoffset': this.properties.size * 2
                });
            } else {
                return false;
            }
        };

        this.createBarTracking = function (width, height, x, y, angle, group, index, color) {
            if (!width || !height || !angle || !group && typeof x == 'number' && typeof y == 'number') return false;

            console.log(color);
            var element = this.properties.svg.element.rect(width, height);

            element.attr({fill: color});

            element.attr({x: 0, y: 0});
            element.translate(x, y - height / 2);
            element.rotate(angle * (180 / Math.PI) + 90);
            element.attr('height', 0).animate(10 * index).attr('height', height);

            if (typeof group == 'object') {
                group.add(element);
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
                        if (!buffer) {
                            console.log('error');
                            return false;
                        }

                        this.bufferTracking(buffer);
                    }.bind(this), function (error) {
                        console.log(error);
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

                var totalItems = Math.PI * 2 / 9;

                for (var i = 0; i < 10; i++) {
                    if(i != 0) {
                        var angle = (i * totalItems) * Math.floor(Math.PI * 180 / Math.random()),
                            x = Math.sin(angle) * this.properties.size / 3,
                            y = Math.cos(angle) * this.properties.size / 3;

                        var circle = this.properties.svg.element.circle(this.properties.size / 2);
                        circle.radius(100).attr({fill: 'red', cx: x, cy: y});

                        this.properties.svg.visualizerCircles.push(circle);
                        this.properties.svg.visualizer.add(circle);
                    } else {
                        var circle = this.properties.svg.element.circle(100);
                        circle.radius(210).attr({fill: 'red', cx: 0, cy: 0});

                        this.properties.svg.visualizerCircles.push(circle);
                        this.properties.svg.visualizer.add(circle);
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

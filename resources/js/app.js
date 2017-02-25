'use strict';

var animateRequestFrame,
    audioAPI = function () {

        this.properties = {
            analyser: undefined,
            audioContext: undefined,
            buffer: null,
            barWidth: 2,
            sound: undefined,
            svg: {
                controls: null,
                currentPosition: null,
                currentTime: null,
                element: null,
                iconPlay: null,
                iconPause: null,
                groupControls: null,
                textInfo: null,
                visualizer: {
                    parent: null,
                    elements: [],
                    colors: ['#b3eeed', '#88ddc5', '#6d958f', '#2da6af']
                },
                visualizerCircles: [],
                visualizerTotalBars: 28
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

            if (percentSoundTime) {
                this.animateCurrentSound(percentSoundTime);
                this.animateVisualyzer(fbc_array);

                animateRequestFrame = requestAnimationFrame(this.animateFrame.bind(this));
            }
        };

        /**
         * animate current sound
         * @param percent
         * @returns {boolean}
         */
        this.animateCurrentSound = function (percent) {
            if (!percent) return false;

            this.animateCurrentSoundBar(percent);
            this.labelTimesAudio();

            if (percent >= 100) {
                this.stopSound();
                this.properties.svg.currentPosition.clear();
            }
        };


        this.animateCurrentSoundBar = function (currentPercent) {
            var angle = this.toDegrees((currentPercent / 100) * 360),
                index = parseInt((currentPercent / 100) * this.properties.totalBars);

            if (this.findElementByAttribute(this.properties.svg.currentPosition.node.children, 'index', index) == true) {
                var audioBuffKey = Math.floor((this.properties.buffer.getChannelData(0).length / this.properties.totalBars) * index),
                    height = this.properties.buffer.getChannelData(0)[audioBuffKey] < 0 ? 10 : this.properties.buffer.getChannelData(0)[audioBuffKey] * 150,
                    x = Math.cos(angle) * 200 + this.properties.size,
                    y = (Math.sin(angle) * 200 + this.properties.size / 2) - height / 2,
                    properties = {fill: '#6e5d7c', x: 0, y: 0, index: index, height: height},
                    element = this.createBarTracking(this.properties.barWidth, height, x, y, angle, properties);

                if (element) {
                    this.properties.svg.currentPosition.add(element);
                    this.animateElement(element, 'height', 20, 0, height);
                }
            }
        };

        /**
         * animate element
         * @param element
         * @param attribute
         * @param time
         * @param valueInit
         * @param valueEnd
         * @returns {boolean}
         */
        this.animateElement = function (element, attribute, time, valueInit, valueEnd) {
            if (!element || !attribute) return false;

            element
                .attr(attribute, valueInit)
                .animate(time)
                .attr(attribute, valueEnd);
        };

        this.animateVisualyzer = function (frequency) {
            var totalItems = Math.PI * 2 / this.properties.svg.visualizerTotalBars;

            for (var k = 0; k < this.properties.svg.visualizer.elements.length; k++) {
                if (k == 0) this.properties.svg.visualizer.elements[k].element.rotate(3);
                if (k == 1) this.properties.svg.visualizer.elements[k].element.rotate(-3);

                for (var i = 0; i < this.properties.svg.visualizer.elements[k].circles.length; i++) {
                    if (i != 0) {
                        var angle = i * totalItems,
                            cx = Math.sin(angle) * 110,
                            cy = Math.cos(angle) * 110;

                        var x = Math.sin(frequency[i] / 2),
                            y = Math.cos(frequency[i] / 2),
                            radiusX = this.maxMinNumber(0, frequency[i] / 2 - Math.floor(Math.random() * 20), frequency[i] / 2 - Math.floor(Math.random() * 20)),
                            radiusY = frequency[i] / 2;

                        if (k == 0 || k == 1)
                            this.properties.svg.visualizer.elements[k].circles[i].animate(100);

                        this.properties.svg.visualizer.elements[k].circles[i].attr({
                            rx: radiusX,
                            ry: radiusY,
                            cx: cx - x,
                            cy: cy - y
                        });
                    }
                }
            }
        };

        this.barCircleTrack = function (channel, total, group, radius, color) {
            var angleTotals = Math.PI * 2 / this.properties.totalBars,
                eachBlock = total / this.properties.totalBars;

            for (var i = 0; i < this.properties.totalBars; i++) {
                var audioBuffKey = Math.floor(eachBlock * i),
                    height = channel[audioBuffKey] < 0 ? 10 : channel[audioBuffKey] * 150,
                    angle = i * angleTotals;

                var x = Math.cos(angle) * radius + this.properties.size,
                    y = (Math.sin(angle) * radius + this.properties.size / 2) - height / 2,
                    properties = {fill: color, x: 0, y: 0, index: i, height: height},
                    element = this.createBarTracking(this.properties.barWidth, height, x, y, angle, properties);

                if (element) {
                    element.style({'cursor': 'pointer'});

                    group.add(element);
                    this.animateElement(element, 'height', 50, 0, height);
                }
            }

            return group;
        };

        this.bufferTracking = function (buffer) {
            var leftChannel = buffer.getChannelData(0);

            if (leftChannel.length > 0) {
                if (this.properties.svg.element != null)
                    this.properties.svg.element.remove();

                this.properties.svg.element = SVG('music').size(this.properties.size, this.properties.size);
                this.properties.svg.controls = SVG('controls').size(this.properties.size, this.properties.size);

                this.properties.svg.groupControls = this.properties.svg.controls.group();
                this.properties.svg.groupControls.translate(this.properties.size / 2, this.properties.size / 2);

                //buffer
                this.properties.buffer = buffer;

                //create circle tracking
                this.createCircleTracking(leftChannel, leftChannel.length, 'rgba(0,0,0,.15)', true);

                this.properties.svg.currentPosition = this.properties.svg.element.group();
                this.properties.svg.currentPosition;

                var radius = (this.properties.size / 2),
                    masking = this.properties.svg.element.circle(radius + 66);

                this.properties.svg.currentPosition.rotate(-90, (this.properties.size / 2) + (radius / 2), (this.properties.size / 2) + (radius / 2));

                masking.attr({
                    fill: 'none',
                    stroke: '#FFF',
                    'stroke-width': 40,
                    cx: this.properties.size + 1,
                    cy: this.properties.size / 2
                });

                this.properties.svg.currentPosition.maskWith(masking);

                this.playSound();

                return true;
            } else {
                return false;
            }
        };

        this.createBarTracking = function (width, height, x, y, angle, properties) {
            if (!width || !height || !angle || !properties) return false;

            var rect = this.properties.svg.element.rect(width, height);

            return rect.attr(properties)
                .translate(x, y)
                .rotate(this.toRadians(angle) + 90);
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

            if (this.barCircleTrack(channel, total, group, radius - 100, color) != false) {
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

        this.findElementByAttribute = function (elements, attribute, find) {
            var checked = true;

            for (var i = 0; i < elements.length; i++) {
                if (elements[i].getAttribute(attribute) == find) {
                    checked = false;
                }
            }

            return checked;
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

        /**
         * get time date
         * @param date
         * @returns {*}
         */
        this.getTimeDate = function (date) {
            if (!date) return false;

            var year = date.getFullYear().toString(),
                month = (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1).toString() : (date.getMonth() + 1).toString(),
                day = date.getDate().toString();

            return year + '/' + month + '/' + day;
        };

        this.iconPause = function () {
            if (this.properties.svg.groupControls == null) return false;

            this.properties.svg.groupControls.clear();

            this.properties.svg.iconPause = this.properties.svg.groupControls.group();

            var barLeft = this.properties.svg.iconPause.path('M 21.484375 16.796875 L 32.683594 16.796875 L 32.683594 59.953125 L 21.484375 59.953125 Z M 21.484375 16.796875'),
                barRight = this.properties.svg.iconPause.path('M 42.316406 16.796875 L 53.515625 16.796875 L 53.515625 59.953125 L 42.316406 59.953125 Z M 42.316406 16.796875');

            barLeft.attr({stroke: 'none', 'fill': '#010101'});
            barRight.attr({stroke: 'none', 'fill': '#010101'});

            this.properties.svg.iconPause
                .on('click', function () {
                    this.stopSound();
                }.bind(this));
        };

        this.iconPlay = function () {
            if (this.properties.svg.groupControls == null) return false;

            this.properties.svg.groupControls.clear();

            this.properties.svg.iconPlay = this.properties.svg.groupControls.polygon('0,0 75,50 0,100');

            this.properties.svg.iconPlay
                .attr({fill: '#010101'})
                .on('click', function () {
                    this.playSound();
                }.bind(this));
        };

        /**
         * info audio
         * @param file
         */
        this.infoAudio = function (file) {
            if (!file) return false;

            var fileName = this.removeExtension(file.name),
                fileName = fileName.length < 30 ? fileName : fileName.slice(0, -(file.name.length - 30)) + '...',
                lastTime = this.getTimeDate(new Date(file.lastModified)),
                label = this.properties.svg.element.text(function (add) {
                    add.tspan(fileName).attr({id: 'title'}).fill('#2da6af').newLine();
                    add.tspan(lastTime).attr({id: 'time', dy: -30}).fill('#2da6af').newLine();
                });

            label.attr({x: (this.properties.size / 2), y: (this.properties.size / 3) - 20, 'text-anchor': 'middle'});

            this.labelTimesAudio();
        };

        /**
         * label time audio
         */
        this.labelTimesAudio = function () {
            var current = this.getTime(this.properties.sound.currentTime),
                totalTime = this.getTime(this.properties.sound.duration);

            if (this.properties.svg.currentTime != null)
                this.properties.svg.currentTime.remove();

            this.properties.svg.currentTime = this.properties.svg.element.text(function (add) {
                add.tspan(current).fill('#9c7bb8');
                add.tspan(' - ').fill('#9c7bb8');
                add.tspan(totalTime).fill('#9c7bb8');
            });

            this.properties.svg.currentTime.attr({
                id: 'current-time',
                x: (this.properties.size / 2),
                y: this.properties.size - 170,
                'text-anchor': 'middle'
            });
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

        this.removeExtension = function (filename) {
            var lastDotPosition = filename.lastIndexOf(".");

            if (lastDotPosition === -1) {
                return filename;
            } else {
                return filename.substr(0, lastDotPosition);
            }
        };


        this.playSound = function () {
            if (!this.properties.sound && typeof this.properties.sound != 'object') return false;

            this.iconPause();

            this.properties.sound.play();
            this.sound.connect(this.properties.analyser);
            this.properties.analyser.connect(this.properties.audioContext.destination);

            this.visualizer();

            animateRequestFrame = requestAnimationFrame(this.animateFrame.bind(this));
        };

        /**
         * select time
         * @param index
         * @returns {boolean}
         */
        this.selectTime = function (index) {
            if (!index) return false;

            var percent = (index / this.properties.totalBars) * 100,
                time = (percent / 100) * this.properties.sound.duration;

            this.properties.sound.currentTime = time.toPrecision(6);

            if (percent > 0 || this.properties.sound.currentTime < this.properties.sound.duration) {
                this.playSound();
            }
        };

        this.stopSound = function () {
            if (!this.properties.sound && typeof this.properties.sound != 'object') return;

            this.iconPlay();

            this.properties.sound.pause();

            if (this.sound.disconnect())
                this.properties.analyser.disconnect(this.properties.audioContext.destination);

            this.visualizerDestroy();

            window.cancelAnimationFrame(animateRequestFrame);
        };

        /**
         * support audio context
         * @returns {boolean}
         */
        this.supportAudioContext = function () {
            window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext || false;

            return !window.AudioContext ? false : true;
        };

        /**
         * support request animate
         * @returns {boolean}
         */
        this.supportRequestAnimateFrame = function () {
            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || false;

            window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

            return !window.requestAnimationFrame || !window.cancelAnimationFrame ? false : true;
        };

        this.toDegrees = function (radians) {
            if (!radians) return false;

            return radians * (Math.PI / 180);
        };

        this.toRadians = function (degrees) {
            if (!degrees) return false;

            return degrees * (180 / Math.PI);
        };

        this.visualizer = function () {
            if (this.properties.svg.visualizer.parent == null) {
                var mask = this.properties.svg.element.circle(515);
                mask.attr({
                    'fill': 'none',
                    'stroke': '#FFF',
                    'stroke-width': 100,
                    cx: 0,
                    cy: 0
                });

                this.properties.svg.visualizer.parent = this.properties.svg.element.group();

                this.properties.svg.visualizer.parent
                    .rotate(90)
                    .translate(this.properties.size / 2, this.properties.size / 2);

                for (var k = 0; k < this.properties.svg.visualizer.colors.length; k++) {
                    var visualizer = this.properties.svg.element.group(),
                        element = {
                            element: visualizer,
                            circles: []
                        };

                    visualizer.style({filter: 'url("#fancy-goo")'});

                    for (var i = 0; i < this.properties.svg.visualizerTotalBars; i++) {
                        if (i != 0) {
                            var angle = (i * (Math.PI * 2 / this.properties.svg.visualizerTotalBars)) * Math.floor(Math.PI * 180 / Math.random()),
                                x = Math.sin(angle) * this.properties.size / 3,
                                y = Math.cos(angle) * this.properties.size / 3;

                            var ellipse = this.properties.svg.element.ellipse(100, 100);
                            ellipse.radius(100, 100).attr({
                                fill: this.properties.svg.visualizer.colors[k],
                                cx: x,
                                cy: y
                            });

                            visualizer.add(ellipse);
                            element.circles.push(ellipse);
                        } else {
                            var ellipse = this.properties.svg.element.ellipse(100, 100);
                            ellipse.radius(210, 210).attr({
                                fill: this.properties.svg.visualizer.colors[k],
                                cx: 0,
                                cy: 0
                            });

                            visualizer.add(ellipse);
                            element.circles.push(ellipse);
                        }
                    }

                    this.properties.svg.visualizer.parent.add(visualizer);
                    this.properties.svg.visualizer.parent.maskWith(mask);

                    this.properties.svg.visualizer.elements.push(element);
                }
            } else {
                this.visualizerDestroy();
            }
        };

        this.visualizerDestroy = function () {
            if (this.properties.svg.visualizer.parent != null) {
                this.properties.svg.visualizer.parent.remove();

                this.properties.svg.visualizer.parent = null;
                this.properties.svg.visualizer.elements = [];
                this.properties.svg.visualizerCircles = [];
            }
        };
    };

var app = new audioAPI();
app.init();

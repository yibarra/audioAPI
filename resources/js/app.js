'use strict';

/**
 * animate & audio object
 */
var animateRequestFrame,
    audioAPI = function () {

        /**
         * [properties description]
         * @type {Object}
         */
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
                    colors: null
                },
                visualizerTotalBars: 28
            },
            size: 600,
            totalBars: 500
        };

        /**
         * [sound description]
         * @type {[type]}
         */
        this.sound = undefined;

        /**
         * init
         */
        this.init = function (colors) {
            if (this.supportRequestAnimateFrame() || this.supportAudioContext()) {
                this.properties.audioContext = new AudioContext();

                this.properties.svg.visualizer.colors = colors instanceof Array ? colors : ['#b3eeed', '#88ddc5', '#6d958f', '#2da6af'];

                this.eventsBind();
            } else {
                alert('Not Support AnimateFrame or AudioContext!');
            }
        };

        /**
         * animate frame rate method
         */
        this.animateFrame = function () {
            var fbc_array = new Uint8Array(this.properties.analyser.frequencyBinCount);
            this.properties.analyser.getByteFrequencyData(fbc_array);

            var percentSoundTime = (this.properties.sound.currentTime / this.properties.sound.duration) * 100;

            if (percentSoundTime < 100) {
                this.animateCurrentSound(fbc_array, percentSoundTime);

                animateRequestFrame = window.requestAnimationFrame(this.animateFrame.bind(this));
            } else if(percentSoundTime == 100) {
                window.cancelAnimationFrame(animateRequestFrame);

                this.stopSound();
                this.animateClearCurrentSoundBars();
            }
        };

        /**
         * animate current sound
         * @param percent
         * @returns {boolean}
         */
        this.animateCurrentSound = function (fbc_array, percent) {
            if (!percent) return false;

            this.animateVisualyzer(fbc_array);
            this.animateCurrentSoundBar(percent);
            this.labelTimesAudio();
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
         * [animateClearCurrentSoundBars description]
         * @return {[type]} [description]
         */
        this.animateClearCurrentSoundBars = function () {
            if(this.properties.svg.currentPosition.node.children.length > 0) {
                this.properties.svg.currentPosition.each(function(i, element) {
                    this.animate(400).attr({'height': 0});
                });
                
                setTimeout(function() {
                    this.properties.svg.currentPosition.clear();
                }.bind(this), 500);
            }
        };

        /**
         * [animateElement description]
         * @param  {[type]} element   [description]
         * @param  {[type]} attribute [description]
         * @param  {[type]} time      [description]
         * @param  {[type]} valueInit [description]
         * @param  {[type]} valueEnd  [description]
         * @return {[type]}           [description]
         */
        this.animateElement = function (element, attribute, time, valueInit, valueEnd) {
            if (!element || !attribute) return false;

            element.attr(attribute, valueInit).animate(time).attr(attribute, valueEnd);
        };

        this.animateVisualyzer = function (frequency) {
            var totalItems = Math.PI * 2 / this.properties.svg.visualizerTotalBars;

            for (var k = 0; k < this.properties.svg.visualizer.elements.length; k++) {
                if (k < (this.properties.svg.visualizer.elements.length - 2))
                    this.properties.svg.visualizer.elements[k].element.rotate(1 * this.maxMinRandom(-1, 1));

                for (var i = 0; i < this.properties.svg.visualizer.elements[k].circles.length; i++) {
                    if (i > 0) {
                        var angle = i * totalItems,
                            cx = Math.sin(angle) * 110,
                            cy = Math.cos(angle) * 110;

                        var x = Math.sin(frequency[i] / 2),
                            y = Math.cos(frequency[i] / 2),
                            radiusX = this.maxMinNumber(0, frequency[i] / 2 - Math.floor(Math.random() * 20), frequency[i] / 2 - Math.floor(Math.random() * 20)),
                            radiusY = frequency[i] / 2;

                        if (k < (this.properties.svg.visualizer.elements.length - 2))
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
                var circleBlack = this.properties.svg.controls.circle(40);
                circleBlack.radius(40).attr({fill: this.properties.svg.visualizer.colors[this.properties.svg.visualizer.colors.length - 1], cx: (this.properties.size / 2), cy: (this.properties.size / 2)});

                this.properties.svg.groupControls = this.properties.svg.controls.group();
                this.properties.svg.groupControls.translate(this.properties.size / 2 - 20, this.properties.size / 2 - 20);


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
                group = this.properties.svg.controls.group(),
                masking = this.properties.svg.controls.circle(radius + 66);

            masking.attr({
                'fill': 'none',
                'stroke': '#FFF',
                'stroke-width': 40,
                cx: this.properties.size + 1,
                cy: this.properties.size / 2
            });

            group.rotate(-90, (this.properties.size / 2) + (radius / 2), (this.properties.size / 2) + (radius / 2));
            group.maskWith(masking);

            if (this.barCircleTrack(channel, total, group, radius - 100, color) != false) {
                group.on('click', function (event) {
                    if (typeof event.target.getAttribute('index') != 'number') {
                        this.selectTime(event.target.getAttribute('index'));
                    }
                }, this);

                return masking;
            } else {
                return false;
            }
        };

        this.decodeAudioData = function (file) {
            if(!file) return false;

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

        /**
         * [eventsBind description]
         * @return {[type]} [description]
         */
        this.eventsBind = function () {
            //watch file
            document.getElementById('file').addEventListener('change', function (event) {
                this.loadSound(event);
            }.bind(this), false);

            //btn click
            document.getElementById('btn-file').addEventListener('click', function (event) {
                var file = document.getElementById('file');
                file.click();
            });
        };

        /**
         * [findElementByAttribute description]
         * @param  {[type]} elements  [description]
         * @param  {[type]} attribute [description]
         * @param  {[type]} find      [description]
         * @return {[type]}           [description]
         */
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

            var barLeft = this.properties.svg.iconPause.path('M12.4,9.9h4.3v20.1h-4.3C12.4,30.1,12.4,9.9,12.4,9.9z'),
                barRight = this.properties.svg.iconPause.path('M23.3,9.9h4.3v20.1h-4.3V9.9z');

            barLeft.attr({stroke: 'none', 'fill': '#FFF'});
            barRight.attr({stroke: 'none', 'fill': '#FFF'});

            this.properties.svg.iconPause
                .style('cursor', 'pointer')
                .on('click', function () {
                    this.stopSound();
                }.bind(this));
        };

        this.iconPlay = function () {
            if (this.properties.svg.groupControls == null) return false;

            this.properties.svg.groupControls.clear();

            this.properties.svg.iconPlay = this.properties.svg.groupControls.polygon('16.5,10.3 27.6,20.2 16.5,30.1');

            this.properties.svg.iconPlay.attr({fill: '#FFF'}).style('cursor', 'pointer')
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
                lastTime = this.getTimeDate(new Date(file.lastModified));

            var label = this.properties.svg.element.text(function (add) {
                    add.tspan(fileName).attr({id: 'title'}).fill('#333').newLine();
                    add.tspan(lastTime).attr({id: 'time', dy: -30}).fill('#676').newLine();
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
                add.tspan(current).fill('#333');
                add.tspan(' - ').fill('#333');
                add.tspan(totalTime).fill('#333');
            });

            this.properties.svg.currentTime.attr({
                id: 'current-time',
                x: (this.properties.size / 2),
                y: this.properties.size - 170,
                'text-anchor': 'middle'
            });
        };

        this.loadSound = function (event) {
            if(event.target && event.target.files[0] != undefined) {
                if(this.properties.sound) {
                    this.stopSound();

                    this.properties.svg.controls.remove();
                    this.properties.sound = undefined;
                }

                this.properties.sound = new Audio();
                this.properties.sound.src = this.decodeAudioData(event.target);

                this.sound = this.properties.audioContext.createMediaElementSource(this.properties.sound);
                this.properties.analyser = this.properties.audioContext.createAnalyser();
            } else {
                console.log('Error');
            }
        };

        /**
         * [maxMinRandom description]
         * @param  {[type]} min [description]
         * @param  {[type]} max [description]
         * @return {[type]}     [description]
         */
        this.maxMinRandom = function (min, max) {
            if(typeof min != 'number' || typeof max != 'number') return false;

            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        /**
         * [maxMinNumber description]
         * @param  {[type]} min    [description]
         * @param  {[type]} max    [description]
         * @param  {[type]} number [description]
         * @return {[type]}        [description]
         */
        this.maxMinNumber = function (min, max, number) {
            if (typeof number != 'number' || typeof min != 'number' || typeof max != 'number') return false;

            return Math.max(min, Math.min(number, max));
        };

        /**
         * [removeExtension description]
         * @param  {[type]} fileName [description]
         * @return {[type]}          [description]
         */
        this.removeExtension = function (fileName) {
            if (typeof fileName == 'string') {
                var lastDotPosition = fileName.lastIndexOf("."),
                    name = (lastDotPosition === -1) ? fileName : fileName.substr(0, lastDotPosition);

                return name.length < 30 ? name : name.slice(0, -(name.length - 30)) + '...';
            }
        };


        this.playSound = function () {
            if (!this.properties.sound && typeof this.properties.sound != 'object') return false;

            this.iconPause();

            this.properties.sound.play();
            this.sound.connect(this.properties.analyser);
            this.properties.analyser.connect(this.properties.audioContext.destination);

            this.visualizer();

            animateRequestFrame = window.requestAnimationFrame(this.animateFrame.bind(this));
        };

        /**
         * [selectTime description]
         * @param  {[type]} index [description]
         * @return {[type]}       [description]
         */
        this.selectTime = function (index) {
            if (!index || isNaN(parseInt(index))) return false;

            var percent = (index / this.properties.totalBars) * 100,
                time = (percent / 100) * this.properties.sound.duration;

            if(typeof time == 'number') {
                this.properties.sound.currentTime = time.toPrecision(10);

                if (percent > 0 || this.properties.sound.currentTime < this.properties.sound.duration) {
                    this.playSound();
                }
            }
        };

        this.stopSound = function () {
            if (!this.properties.sound && typeof this.properties.sound != 'object') return;

            this.iconPlay();

            this.properties.sound.pause();

            if (this.sound.disconnect()) {
                this.properties.analyser.disconnect(this.properties.audioContext.destination);
                this.visualizerDestroy();
            }
        };

        /**
         * [supportAudioContext description]
         * @return {[type]} [description]
         */
        this.supportAudioContext = function () {
            return window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || false;
        };

        /**
         * [supportRequestAnimateFrame description]
         * @return {[type]} [description]
         */
        this.supportRequestAnimateFrame = function () {
            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || false;

            window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

            return window.requestAnimationFrame;
        };

        /**
         * [toDegrees description]
         * @param  {[type]} radians [description]
         * @return {[type]}         [description]
         */
        this.toDegrees = function (radians) {
            if (!radians || typeof radians != 'number') return false;

            return radians * (Math.PI / 180);
        };

        /**
         * [toRadians description]
         * @param  {[type]} degrees [description]
         * @return {[type]}         [description]
         */
        this.toRadians = function (degrees) {
            if (!degrees || typeof degrees != 'number') return false;

            return degrees * (180 / Math.PI);
        };

        /**
         * [visualizer description]
         * @return {[type]} [description]
         */
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
            }
        };

        /**
         * [visualizerDestroy description]
         * @return {[type]} [description]
         */
        this.visualizerDestroy = function () {
            if (this.properties.svg.visualizer.parent != null) {
                this.properties.svg.visualizer.elements = [];

                this.properties.svg.visualizer.parent.clear();
                this.properties.svg.visualizer.parent = null;
            }
        };
    };

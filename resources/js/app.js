(function () {
    var app,
        audioAPI = {
            analyser: null,
            audioContext: null,

            options: {
                svg: {
                    element: null,
                    size: 600
                },
                barsLength: 300,
                sound: null
            },

            sound: null,

            init: function () {
                app = this;

                if (app.validateAudioAPI()) {
                    app.loadMusic();
                } else {
                    console.log('Error...');
                }
            },


            barCircleTrackingBackground: function (leftChannel, leftChannelTotal, group, radius) {
                var angleTotals = Math.PI * 2 / app.options.barsLength,
                    eachBlock = Math.floor(leftChannelTotal / app.options.barsLength);

                for (var i = 0; i < app.options.barsLength; i++) {
                    var audioBuffKey = Math.floor(eachBlock * i),
                        heightElement = leftChannel[audioBuffKey] < 0 ? leftChannel[audioBuffKey] * -1 : leftChannel[audioBuffKey] * 120,
                        angle = i * angleTotals;

                    heightElement = app.maxMin(10, heightElement, 140);

                    var x = Math.cos(angle) * radius + app.options.svg.size,
                        y = Math.sin(angle) * radius + app.options.svg.size / 2;

                    app.createBarCircleTracking(3, heightElement, x, y, angle, group, '#8F9499');
                }

                return group;
            },

            barCircleTrackingCurrentTime: function (currentTime) {
                if(!currentTime) return false;

                console.log(currentTime, app.options.sound.duration / app.options.barsLength);
            },

            createBarCircleTracking: function (widthElement, heightElement, x, y, angle, group, index, color) {
                if (!widthElement || !heightElement || !angle || !group && typeof x == 'number' && typeof y == 'number') return false;

                var element = app.options.svg.element.rect(widthElement, heightElement),
                    backgroundColor = typeof color == 'string' && color != undefined ? color : '#222';

                element.attr({fill: backgroundColor});

                element.attr({x: 0, y: 0});
                element.translate(x, y - heightElement / 2);
                element.rotate(angle * (180 / Math.PI) + 90);
                element.attr('height', 0).animate(10 * index).attr('height', heightElement);

                if (typeof group == 'object') {
                    group.add(element);
                }
            },

            createCircleTracking: function (leftChannel, leftChannelTotal) {
                var radius = (app.options.svg.size / 2);

                var group = app.options.svg.element.group();
                var masking = app.options.svg.element.circle(radius + 66);

                group.translate(-(app.options.svg.size / 2), 0);
                group.style({opacity: '.7'});

                masking.attr({'fill': 'none', 'stroke': 'red', 'stroke-width': 40});
                masking.attr({cx: app.options.svg.size + 1, cy: app.options.svg.size / 2});

                var circleBars = app.barCircleTrackingBackground(leftChannel, leftChannelTotal, group, radius - 100);

                if(circleBars != false) {
                    group.maskWith(masking);
                }
            },

            /**
             * decode audio data
             * @param file
             * @returns {*}
             */
            decodeAudioData: function (file) {
                var fileReader = new FileReader;

                fileReader.onload = function () {
                    var arrayBuffer = this.result;

                    app.audioContext.decodeAudioData(arrayBuffer,
                        function (buffer) {
                            app.fullTracking(buffer);
                        }, function (error) {
                            console.log(error);
                            return false;
                        });
                };

                fileReader.readAsArrayBuffer(file.files[0]);

                return URL.createObjectURL(file.files[0]);
            },

            frameLooper: function () {
                window.requestAnimationFrame(app.frameLooper);

                var fbc_array = new Uint8Array(app.analyser.frequencyBinCount);
                app.analyser.getByteFrequencyData(fbc_array);

                console.log(fbc_array);

                app.barCircleTrackingCurrentTime(app.options.sound.currentTime);
            },

            fullTracking: function (buffer) {
                var leftChannel = buffer.getChannelData(0);

                if (leftChannel.length > 0) {
                    if(app.options.svg.element != null) {
                        app.options.svg.element.remove();
                    }

                    app.options.svg.element = SVG('music').size(app.options.svg.size, app.options.svg.size);

                    //create circle tracking
                    app.createCircleTracking(leftChannel, leftChannel.length);
                } else {
                    return false;
                }
            },



            loadMusic: function () {
                document.querySelector('input').onchange = function () {
                    app.options.sound = new Audio();
                    app.options.sound.src = app.decodeAudioData(this);

                    app.sound = app.audioContext.createMediaElementSource(app.options.sound);
                    app.analyser = app.audioContext.createAnalyser();

                    app.sound.connect(app.analyser);
                    app.analyser.connect(app.audioContext.destination);

                    app.frameLooper();
                };

                document.getElementById('play').addEventListener('click', function () {
                    app.playSound();
                });

                document.getElementById('stop').addEventListener('click', function () {
                    app.stopSound();
                });
            },


            /**
             * max min
             * @param min
             * @param max
             * @param number
             * @returns {number}
             */
            maxMin: function (min, max, number) {
                return Math.max(min, Math.min(number, max));
            },

            /**
             * play sound
             */
            playSound: function () {
                if (app.options.sound && typeof app.options.sound == 'object')
                    app.options.sound.play();
            },

            /**
             * stop sound
             */
            stopSound: function () {
                if (app.options.sound && typeof app.options.sound == 'object')
                    app.options.sound.pause();
            },

            /**
             * context audio api
             * @returns {boolean}
             */
            validateAudioAPI: function () {
                window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

                try {
                    app.audioContext = new AudioContext();
                    return true;
                } catch (e) {
                    console.log('!Your browser does not support AudioContext', e);
                }

                return false;
            }
        };


    audioAPI.init();
})();


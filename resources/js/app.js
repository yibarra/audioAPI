(function () {
    var app,
        audioAPI = {
            audioContext: null,

            options: {
                svg: {
                    element: null,
                    size: 500
                },
                barsLength: 300,
                sound: null
            },

            init: function () {
                app = this;

                if (app.validateAudioAPI()) {
                    app.loadMusic();
                } else {
                    console.log('Error...');
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

            loadMusic: function () {
                app.options.svg.element = SVG('music').size(app.options.svg.size * 2, app.options.svg.size);

                var element = app.options.svg.element.path('M' + app.options.svg.size / 2 + ', ' + app.options.svg.size / 2 +
                    ' m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0');
                element.attr({'fill': 'none', 'stroke': '#8F9499', 'stroke-width': 100});


                document.querySelector('input').onchange = function () {
                    app.options.sound = new Audio();
                    app.options.sound.src = app.decodeAudioData(this);
                };


                document.getElementById('play').addEventListener('click', function () {
                    app.playSound();
                });

                document.getElementById('stop').addEventListener('click', function () {
                    app.stopSound();
                });
            },

            fullTracking: function (buffer) {
                var leftChannel = buffer.getChannelData(0);

                if (leftChannel.length > 0) {
                    app.createCircleTracking(leftChannel, leftChannel.length);
                } else {
                    return false;
                }
            },

            backgroundFullTracking: function () {

            },

            createCircleTracking: function (leftChannel, leftChannelTotal) {
                var radius = app.options.svg.size / 2 - 20;

                var group = app.options.svg.element.group();
                var masking = app.options.svg.element.circle(radius);

                masking.attr({'fill': 'none', 'stroke': '#8F9499', 'stroke-width': 100});
                masking.attr({cx: app.options.svg.size, cy: app.options.svg.size / 2});
                masking.radius(radius);

                var circleBars = app.barCircleTracking(leftChannel, leftChannelTotal, group, radius);

                if(circleBars != false) {
                    group.maskWith(masking);
                }
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

            barCircleTracking: function (leftChannel, leftChannelTotal, group, radius) {
                var angleTotals = Math.PI * 2 / app.options.barsLength,
                    eachBlock = Math.floor(leftChannelTotal / app.options.barsLength);

                for (var i = 0; i < app.options.barsLength; i++) {
                    var audioBuffKey = Math.floor(eachBlock * i),
                        heightElement = leftChannel[audioBuffKey] < 0 ? leftChannel[audioBuffKey] * -1 : leftChannel[audioBuffKey] * 200,
                        angle = i * angleTotals;

                    heightElement = app.maxMin(10, heightElement, 140);

                    var x = Math.cos(angle) * radius + app.options.svg.size,
                        y = Math.sin(angle) * radius + app.options.svg.size / 2;

                    app.createBarCircleTracking(3, heightElement, x, y, angle, group, '#8F9499');
                }

                return group;
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

            validateAudioAPI: function () {
                window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

                try {
                    app.audioContext = new webkitAudioContext();
                    return true;
                } catch (e) {
                    console.log('!Your browser does not support AudioContext', e);
                }

                return false;
            }
        };


    audioAPI.init();
})();


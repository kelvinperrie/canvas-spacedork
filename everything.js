$(document).ready(function () {

    var player = function (setup) {
        var self = this;

        self.id = setup.id || 1;
        self.colour = "#008c2f";
    }

    var mover = function (setup) {
        var self = this;

        self.target = setup.target;
        self.source = setup.source;
        self.image = new Image();
        self.image.src = 'images/fleetmarker-white-10.png';

        self.distance = Math.sqrt(Math.pow(self.target.x - self.source.x, 2) + Math.pow(self.target.y - self.source.y, 2));
        self.delay = self.distance * 50;
        self.angleRadians = Math.atan2(self.target.y - self.source.y, self.target.x - self.source.x, 2);

        self.orbiters = setup.orbiters;
        self.timeOfStart = new Date().getTime();
        self.timeOfArrival = new Date().getTime() + self.delay;
        self.ownerPlayerId = setup.ownerPlayerId;
        self.ownerPlayer = setup.ownerPlayer;

        self.CombatPower = function () {
            var power = 0;
            for (var i = 0; i < self.orbiters.length; i++) {
                power = power + self.orbiters[i].CombatPower();
            }
            return power;
        }
        self.HasArrived = function () {
            var currentTime = new Date().getTime();
            return currentTime >= self.timeOfArrival;
        }
        self.Draw = function (ctx) {
            ctx.save();
            // work out where we are I guess
            // this is a bit backwards, this object should have a loop other than the draw loop
            var currentTime = new Date().getTime();
            var percentageOfJourney = (currentTime - self.timeOfStart) / (self.timeOfArrival - self.timeOfStart);
            //console.log(percentageOfJourney);

            ctx.translate(self.source.x, self.source.y);
            ctx.rotate(self.angleRadians);
            ctx.translate(-5, -5);

            ctx.drawImage(self.image, self.distance * percentageOfJourney, 0);

            ctx.restore();
        }
    }

    var orbiter = function (combatAdjustments) {
        var self = this;

        self.combatAdjustments = combatAdjustments || [];

        self.CombatPower = function () {
            var power = 1;
            for (var i = 0; i < self.combatAdjustments.length; i++) {
                power = power * self.combatAdjustments[i].value;
            }
            return power;
        }
    }

    var producer = function (setup) {
        var self = this;

        self.orbiters = [];
        self.x = setup.x || 100;
        self.y = setup.y || 100;
        self.name = setup.producerName;
        self.image = new Image();
        self.image.src = 'images/' + setup.image;
        self.isSelected = false;
        self.ownerPlayerId = setup.ownerPlayerId || 0;
        self.ownerPlayer = setup.ownerPlayer || null;
        self.lastProductionTime = new Date().getTime();
        self.productionRate = setup.productionRate;
        self.producedOrbiterAdjustments = setup.producedOrbiterAdjustments || [];
        self.visited = setup.visited || false;

        self.CombatPower = function () {
            var power = 0;
            for (var i = 0; i < self.orbiters.length; i++) {
                power = power + self.orbiters[i].CombatPower();
            }
            return power;
        }
        self.Tick = function () {
            var currentTime = new Date().getTime();
            if ((self.productionRate !== 0) && ((currentTime - self.lastProductionTime) > self.productionRate)) {
                //console.log("make something");
                self.ProduceOrbiter();
                self.lastProductionTime = currentTime;
                //console.log(self.name + " now has " + self.orbiters.length + " orbiters");
            } else {

            }
        }
        self.CountsAsClick = function (x, y) {
            if ((x < self.x + 10) && (x > self.x - 10)) {
                if ((y < self.y + 10) && (y > self.y - 10)) {
                    return true;
                }
            }
            return false;
        }
        self.Draw = function (ctx) {
            ctx.save();

            ctx.translate(self.x, self.y);

            ctx.strokeStyle = "#fcc9b8";
            if (self.ownerPlayer) {
                ctx.strokeStyle = self.ownerPlayer.colour;
            }

            //if(self.isSelected) {
            //    ctx.strokeStyle="#FF0000";
            //}

            if (self.isSelected) {
                ctx.save();
                ctx.strokeStyle = "#FF0000";
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.restore();
            }

            ctx.save();
            //ctx.translate(-5, -5);
            ctx.drawImage(self.image, -10, -10);
            ctx.restore();

            ctx.save();
            if (self.visited) {
                ctx.translate(0, 20);
                ctx.textAlign = "center";
                ctx.strokeText(self.name, 0, 0); // + "(" + self.ownerPlayerId + ")", 0, 0);
            }
            ctx.restore();

            ctx.save();
            if (self.visited) {
                ctx.translate(0, -15);
                ctx.textAlign = "center";
                ctx.strokeText(self.orbiters.length, 0, 0);
            }
            ctx.restore();

            ctx.restore();
        }
        self.ProduceOrbiter = function () {
            self.orbiters.push(new orbiter(self.producedOrbiterAdjustments));
        }
        if (setup.initialOrbiterCount) {
            for (var i = 0; i < setup.initialOrbiterCount; i++) {
                self.ProduceOrbiter();
            }
        }
    }

    var universe = function () {
        var self = this;

        self.players = [];
        self.producers = [];
        self.movers = [];
        self.canvas = document.getElementById('canvas');
        self.sourceProducer = null;
        self.showingHoverForProducer = null;

        self.stylePaddingLeft, self.stylePaddingTop, self.styleBorderLeft, self.styleBorderTop;
        if (document.defaultView && document.defaultView.getComputedStyle) {
            self.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(self.canvas, null)['paddingLeft'], 10) || 0;
            self.stylePaddingTop = parseInt(document.defaultView.getComputedStyle(self.canvas, null)['paddingTop'], 10) || 0;
            self.styleBorderLeft = parseInt(document.defaultView.getComputedStyle(self.canvas, null)['borderLeftWidth'], 10) || 0;
            self.styleBorderTop = parseInt(document.defaultView.getComputedStyle(self.canvas, null)['borderTopWidth'], 10) || 0;
        }
        var html = document.body.parentNode;
        self.htmlTop = html.offsetTop;
        self.htmlLeft = html.offsetLeft;

        self.Loop = function () {
            for (var i = 0; i < self.producers.length; i++) {
                if (typeof (self.producers[i].Tick) == "function") {
                    self.producers[i].Tick();
                }
            }
            for (var i = 0; i < self.movers.length; i++) {
                if (self.movers[i].HasArrived()) {
                    console.log("movers " + i + " has arrived!");
                    var arrivedMover = self.movers[i];
                    //arrivedMover.target.orbiters.concat(arrivedMover.orbiters);
                    // locate the target
                    for (var j = 0; j < self.producers.length; j++) {
                        console.log(self.producers[j].name + " === " + arrivedMover.target.name);
                        if (self.producers[j].name === arrivedMover.target.name) {
                            var target = self.producers[j];

                            self.MoverArrivedAtTarget(arrivedMover, target);

                            console.log("removing mover " + i + " from collection");
                            self.movers.splice(i, 1);
                            console.log("now have " + self.movers.length + " movers in our collection");
                            break;
                        }
                    }
                }
            }
            setTimeout(function () { self.Loop(); }, 20);
        }
        self.Loop();

        self.MoverArrivedAtTarget = function (arrivedMover, target) {
            // mark this producer as having been visited
            target.visited = true;
            if (arrivedMover.ownerPlayerId === target.ownerPlayerId) {
                // add the arrivals to the existing orbiters
                console.log("adding " + arrivedMover.orbiters.length + " orbiters to " + target.name + " which has " + target.orbiters.length);
                target.orbiters = target.orbiters.concat(arrivedMover.orbiters);
            } else {
                var arrivedMoverCombatPower = arrivedMover.CombatPower();
                var targetCombatPower = target.CombatPower();
                console.log("mover combat power is " + arrivedMoverCombatPower);
                console.log("target combat power is " + targetCombatPower);
                // whoever has the most wins, potentially the producer changes hands
                if (targetCombatPower >= arrivedMoverCombatPower) {
                    // equal, all orbiters go :(
                    target.orbiters = [];
                } else if (targetCombatPower > arrivedMoverCombatPower) {
                    // defenders fight off the attackers
                    var percentDifference = (arrivedMoverCombatPower / targetCombatPower);
                    var amountOfOrbitersDestroyed = Math.round(percentDifference * target.orbiters.length);
                    console.log("Defender had " + targetCombatPower + "p|" + target.orbiters.length + "s. Attacker had " + arrivedMoverCombatPower + "p|" + arrivedMover.orbiters.length + "s");
                    console.log("percentDifference was " + percentDifference + ", which meant that " + amountOfOrbitersDestroyed + " orbiters were destroyed ");
                    target.orbiters.splice(0, amountOfOrbitersDestroyed);
                } else {
                    // attackers beat the defenders, producer changes owner
                    var percentDifference = (targetCombatPower / arrivedMoverCombatPower);
                    var amountOfOrbitersDestroyed = Math.round(percentDifference * arrivedMover.orbiters.length);
                    console.log("Defender had " + targetCombatPower + "p|" + target.orbiters.length + "s. Attacker had " + arrivedMoverCombatPower + "p|" + arrivedMover.orbiters.length + "s");
                    console.log("percentDifference was " + percentDifference + ", which meant that " + amountOfOrbitersDestroyed + " orbiters were destroyed ");
                    arrivedMover.orbiters.splice(0, amountOfOrbitersDestroyed);
                    target.orbiters = arrivedMover.orbiters;
                    target.ownerPlayerId = arrivedMover.ownerPlayerId;
                    target.ownerPlayer = arrivedMover.ownerPlayer;
                }
            }
        }

        self.Draw = function (ctx) {
            for (var i = 0; i < self.producers.length; i++) {
                if (typeof (self.producers[i].Draw) == "function") {
                    self.producers[i].Draw(ctx);
                }
            }
            for (var i = 0; i < self.movers.length; i++) {
                if (typeof (self.movers[i].Draw) == "function") {
                    self.movers[i].Draw(ctx);
                }
            }
        }

        document.getElementById('canvas').addEventListener('mousemove', function (e) {
            var mouse = self.GetMouse(e);
            var mx = mouse.x;
            var my = mouse.y;

            for (var i = self.producers.length - 1; i >= 0; i--) {
                if (self.producers[i].CountsAsClick(mx, my)) {
                    var match = self.producers[i];

                    console.log(match.name + " was hovered over!");
                    self.ShowProducerHoverInfo(match);
                    return;
                }
            }
            // nothing is hovered over
            self.HideProducerHoverInfo();
        }, true);

        self.ShowProducerHoverInfo = function (producer) {
            if (producer === self.showingHoverForProducer) return;
            console.log("setting new hover");
            self.showingHoverForProducer = producer;
            var producerName = producer.visited ? producer.name : "???";
            var producerRate = producer.visited ? producer.productionRate : "???";
            var html = "<div class='producer-name'>" + producerName + "</div>";
            html = html + "<div>Production rate => " + producerRate + "</div>";
            if (producer.visited) {
                if (producer.producedOrbiterAdjustments.length > 0) {
                    html = html + "<div>Production combat bonuses:</div>";
                }
                for (var i = 0; i < producer.producedOrbiterAdjustments.length; i++) {
                    var adjustment = producer.producedOrbiterAdjustments[i];
                    html = html + "<div>" + adjustment.name + " => " + adjustment.value + "</div>";
                }
            }
            $('.producer-hover-info').html(html);
            $('.producer-hover-info').css({ top: producer.y - 15, left: producer.x + 15 });
            $('.producer-hover-info').show();
        }
        self.HideProducerHoverInfo = function () {
            self.showingHoverForProducer = null;
            $('.producer-hover-info').hide();
        }

        document.getElementById('canvas').addEventListener('mousedown', function (e) {
            var mouse = self.GetMouse(e);
            var mx = mouse.x;
            var my = mouse.y;

            for (var i = self.producers.length - 1; i >= 0; i--) {
                if (self.producers[i].CountsAsClick(mx, my)) {
                    var match = self.producers[i];
                    if (self.sourceProducer) {
                        // a target has been clicked
                        // is the target the same as the source? if so, do nothing
                        if (self.sourceProducer.name !== match.name) {
                            // create a mover, load it with orbiters, reduce orbiters on the target
                            var newMover = new mover({ orbiters: self.sourceProducer.orbiters, source: self.sourceProducer, target: match, ownerPlayer: self.sourceProducer.ownerPlayer, ownerPlayerId: self.sourceProducer.ownerPlayerId });
                            self.movers.push(newMover);
                            self.sourceProducer.orbiters = [];
                        }
                    } else {
                        console.log(match.name + " was clicked on!");
                        if (match.ownerPlayerId === 1) {
                            self.SetSourceProducer(match);
                            return;
                        }
                    }
                }
            }
            self.ClearSourceProducer();
        }, true);

        self.SetSourceProducer = function (producer) {
            self.sourceProducer = producer;
            self.sourceProducer.isSelected = true;
        }
        self.ClearSourceProducer = function (producer) {
            if (!self.sourceProducer) return;
            self.sourceProducer.isSelected = false;
            self.sourceProducer = null;
        }

        self.GetMouse = function (e) {
            var element = self.canvas, offsetX = 0, offsetY = 0, mx, my;

            // Compute the total offset
            if (element.offsetParent !== undefined) {
                do {
                    offsetX += element.offsetLeft;
                    offsetY += element.offsetTop;
                } while ((element = element.offsetParent));
            }

            // Add padding and border style widths to offset
            // Also add the offsets in case there's a position:fixed bar
            offsetX += self.stylePaddingLeft + self.styleBorderLeft + self.htmlLeft;
            offsetY += self.stylePaddingTop + self.styleBorderTop + self.htmlTop;

            mx = e.pageX - offsetX;
            my = e.pageY - offsetY;

            // We return a simple javascript object (a hash) with x and y defined
            return { x: mx, y: my };
        }

        var player1 = new player({});
        self.players.push(player1);
        self.producers.push(new producer({ producerName: "Earth", x: 100, y: 100, image: 'planet1.png', productionRate: 5000, ownerPlayer: player1, ownerPlayerId: 1, visited: true, initialOrbiterCount: 3, producedOrbiterAdjustments: [{name: 'Cool paint job', value: 1.5}] }));
        self.producers.push(new producer({ producerName: "Mars", x: 200, y: 150, image: 'planet2.png', productionRate: 7000, visited: true, initialOrbiterCount: 3 }));
        self.producers.push(new producer({ producerName: "Bob", x: 300, y: 275, image: 'planet3.png', productionRate: 3000 }));
        self.producers.push(new producer({ producerName: "Ugh", x: 300, y: 200, image: 'planet4.png', productionRate: 0, visited: true, initialOrbiterCount: 2 }));
        self.producers.push(new producer({ producerName: "Boomer", x: 450, y: 100, image: 'planet5.png', productionRate: 4000, initialOrbiterCount: 2 }));
        self.producers.push(new producer({ producerName: "Money Pit", x: 350, y: 300, image: 'planet6.png', productionRate: 6000, initialOrbiterCount: 1, producedOrbiterAdjustments: [{ name: 'Fancy lazyors', value: 1.6 }]  }));
        self.producers.push(new producer({ producerName: "FIJI!", x: 50, y: 270, image: 'planet7.png', productionRate: 6000, initialOrbiterCount: 2, producedOrbiterAdjustments: [{ name: 'Additonal sheilding', value: 1.2 }]  }));
        self.producers.push(new producer({ producerName: "Pot1", x: 500, y: 350, image: 'planet4.png', productionRate: 5000, initialOrbiterCount: 1 }));
        self.producers.push(new producer({ producerName: "Pot3", x: 550, y: 450, image: 'planet3.png', productionRate: 5000, initialOrbiterCount: 1 }));
        self.producers.push(new producer({ producerName: "Donkton Prime", x: 200, y: 550, image: 'planet1.png', productionRate: 0, initialOrbiterCount: 6 }));
        self.producers.push(new producer({ producerName: "spacedork", x: 250, y: 450, image: 'planet2.png', productionRate: 3000, initialOrbiterCount: 6 }));
    }

    var everything = new universe();




    function draw() {

        var canvas = document.getElementById('canvas');

        if (canvas.getContext) {
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.save();

            everything.Draw(ctx);

            ctx.restore();
            setTimeout(function () { draw(); }, 20);
        }
    }
    draw();
});
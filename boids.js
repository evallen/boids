/**
 * Sets up a large rectangle that covers the screen to act
 * as the background with the specified color.
 * Also sets up the view's resize handler to automatically
 * adjust the background when the window is resized.
 * @param {String} backgroundColor The background color.
 */
function setupBackground(backgroundColor) {
    bgRect = new Path.Rectangle(new Point(), view.size);
    bgRect.fillColor = backgroundColor;
    bgRect.sendToBack();
}


/**
 * Make a new boid Path object.
 * Relative distances given in the parameters are from 0-1, and are scaled
 * by `boidSize`. 
 * @param {Number} boidSize The scaling factor that determines the size of 
 *                          the boid.
 * @param {Number} boidLength The relative length of the boid.
 * @param {Number} boidCenterLength The relative length from the tip of the 
 *                                  boid to the back indent.
 * @param {Number} boidWidth The relative width of the boid.
 * @param {String} boidColor The color of the boid.
 * @returns {Path} A boid path with the specified parameters.
 */
function makeBoidPath(boidSize, boidLength, boidCenterLength, boidWidth, boidColor) {
    var boidPath = new paper.Path();

    boidPath.add([0, 0]);  // Nose
    boidPath.add([boidWidth / 2 * boidSize, boidLength * boidSize]);  // Right corner
    boidPath.add([0, boidCenterLength * boidSize]);  // Back indent
    boidPath.add([-boidWidth / 2 * boidSize, boidLength * boidSize]);  // Left corner

    // Turn to face the right direction, since 0 degrees points right.
    boidPath.rotate(90);

    boidPath.closed = true;
    boidPath.fillColor = boidColor;

    return boidPath;
}


/**
 * Create a new Obstacle.
 * @param {paper.Point} position The position of the obstacle.
 * @param {paper.Color} color The color of the obstacle.
 * @param {Number} affectRadius The radius the obstacle affects other boids.
 */
function Obstacle(position, color, affectRadius) {
    this.instance = new Path.Circle(position, 5);
    this.instance.fillColor = color;
    this.affectRadius = affectRadius;
}


/**
 * Create a new Boid.
 * @param {paper.Point} position Where the boid will begin.
 * @param {paper.Point} velocity The velocity vector of the boid.
 * @param {*} boidTemplate A path or symbol to copy to make the boid (specify which in `asSymbol`).
 * @param {Array<Number>} weights A 3-array of weights representing the relative
 *                                  weight of the cohesion, avoidance, and following
 *                                  vectors.
 * @param {Array<Number>} perceptionRadii An array of two numbers: 
 *                                      [perceptionRadius, avoidanceRadius] where perceptionRadius
 *                                      is how far they can see other boids and the avoidanceRadius
 *                                      is the distance within which they will steer clear of other boids.
 * @param {Number} maxSpeed The maximum speed of the boid.
 * @param {Number} maxForce The maximum force on the boid.
 * @param {Boolean} asSymbol Whether or not to use boidTemplate as a symbol (if false, we'll clone it). 
 */
function Boid(position, velocity, boidTemplate, weights, perceptionRadii, maxSpeed, maxForce, asSymbol) {
    this.velocity = velocity;
    if (asSymbol) {
        this.instance = boidTemplate.place(position);
    }
    else {
        this.instance = boidTemplate.clone();
    }
    this.instance.applyMatrix = false; // Needed for rotation to work.
    this.instance.position = position;
    this.weights = weights;
    this.perceptionRadius = perceptionRadii[0]
    this.avoidanceRadius = perceptionRadii[1];
    this.maxSpeed = maxSpeed;
    this.maxForce = maxForce;

    /**
     * Figure out what to do for the Boid. 
     * We do this because we want to figure out
     * the new velocity but NOT move before we've calculated
     * the chnages for each boid.
     */
    this.react = function () {
        this.applyForce();
    }

    /**
     * Move the boid for one tick. 
     * Should be called after this.react().
     */
    this.update = function () {
        this.instance.rotation = this.velocity.angle;
        this.instance.position += this.velocity;
        this.checkBorders();
        this.instance.fillColor = {
            hue: this.velocity.angle,
            saturation: 1,
            lightness: 0.6
        };
    }

    /**
     * Update the velocity based on the four rules
     * (cohesion, avoidance, following, and obstacles).
     */
    this.applyForce = function () {
        this.velocity += this.getCohesionVector() * this.weights[0] +
            this.getAvoidanceVector() * this.weights[1] +
            this.getFollowVector() * this.weights[2] + 
            this.getObstacleVector() * this.weights[3];

        // Noise.
        this.velocity += (Point.random() - new Point(.5, .5)) * 2 * .1

        if (this.velocity.length > this.maxSpeed) {
            this.velocity.length = this.maxSpeed;
        }
    }


    /**
     * Given a desired velocity vector, get the required steer
     * (acceleration). Assumes we want to go at the maximum
     * speed in that direction. 
     * Caps the steering force at `this.maxSpeed`. 
     * @param {Point} desired The desired velocity vector.
     * @returns {Point} The required steer vector.
     */
    this.getSteer = function (desired) {
        if (desired.length == 0) {
            return new Point(); // No steer.
        }
        else {
            desired.length = this.maxSpeed;
        }
        var steer = desired - this.velocity;
        if (steer.length > this.maxForce) {
            steer.length = this.maxForce;
        }
        return steer;
    }


    /**
     * Boids try to remain close to other boids.
     * Considers only boids within a certain radius.
     * Get the corresponding vector.
     */
    this.getCohesionVector = function () {
        var centerOfMass = new Point();
        var numBoidsSeen = 0;
        for (i in boids) {
            var displacement = boids[i].instance.position - this.instance.position;
            if (displacement.length < this.perceptionRadius) {
                centerOfMass += boids[i].instance.position;
                numBoidsSeen++;
            }
        }

        if (numBoidsSeen > 0) {
            centerOfMass /= numBoidsSeen;
        }

        return this.getSteer(centerOfMass - this.instance.position);
    }

    /**
     * Boids try to avoid collisions with other boids.
     * Get the corresponding vector.
     */
    this.getAvoidanceVector = function () {
        var avoidanceVector = new Point();

        // Avoid boids. 

        for (i in boids) {
            var displacement = boids[i].instance.position - this.instance.position;
            if (boids[i] != this && 
                displacement.length < this.avoidanceRadius) {
                avoidanceVector -= displacement.normalize() / displacement.length;
            }
        }

        return this.getSteer(avoidanceVector);
    }


    /**
     * Get the vector pointing away from nearby obstacles.
     */
    this.getObstacleVector = function () {
        var obstacleVector = new Point();
        var closestDist = 99999999999;

        for (i in obstacles) {
            // var ahead1 = this.instance.position + this.velocity * lookAhead;
            // var ahead2 = ahead2 * 0.5;
            // var disp1 = ahead1 - obstacles[i].instance.position;
            // var disp2 = ahead2 - obstacles[i].instance.position;

            // if (disp1.length < obstacles[i].affectRadius || disp2.length < obstacles[i].affectRadius) {
            //     if (disp1.length < closestDist) {
            //         closestDist = disp1.length;
            //         obstacleVector = disp1;
            //     }
            //     if (disp2.length < closestDist) {
            //         closestDist = disp2.length;
            //         obstacleVector = disp2;
            //     }
            // }

            // Find closest obstacle.
            var disp = obstacles[i].instance.position - this.instance.position;

            // Find orthogonal projection from the hitscan line to the obstacle.
            var perp = disp - this.velocity * 
                        ((disp.dot(this.velocity) / (this.velocity.length * this.velocity.length)))

            if (perp.length < obstacles[i].affectRadius) {
                // On a hit
                if (disp.length < closestDist) {
                    closestDist = disp.length;
                    obstacleVector = perp * -1;
                }
            }
        }

        // return this.getSteer(obstacleVector);
        return obstacleVector.normalize();
    }


    /**
     * Boids try to match velocity with other boids.
     * Get the corresponding vector.
     */
    this.getFollowVector = function () {
        var avgVelocity = new Point();
        var numBoidsSeen = 0;
        for (i in boids) {
            var displacement = boids[i].instance.position - this.instance.position;
            if (boids[i] != this &&
                displacement.length < this.perceptionRadius) {
                avgVelocity += boids[i].velocity;
                numBoidsSeen++;
            }
        }

        if (numBoidsSeen > 0) {
            avgVelocity /= numBoidsSeen;
        }

        return this.getSteer(avgVelocity);
    }

    /**
     * Stop boids from going off-screen.
     */
    this.checkBorders = function () {
        if (this.instance.position.x > view.size.width) {
            this.instance.position.x = 0;
        }
        else if (this.instance.position.x < 0) {
            this.instance.position.x = view.size.width;
        }
        if (this.instance.position.y > view.size.height) {
            this.instance.position.y = 0;
        }
        else if (this.instance.position.y < 0) {
            this.instance.position.y = view.size.height;
        }
    }
}



/**
 * Updates the screen on every frame.
 */
function onFrame() {
    for (i in boids) {
        boids[i].react();
    }
    for (i in boids) {
        boids[i].update();
    }

    var nowTime = Date.now();
    fpsCounter.content = "FPS: " + Math.round(1000 / (nowTime - lastFrameTime));
    lastFrameTime = nowTime;
}


/**
 * Create obstacles when the mouse is clicked.
 */
function onMouseDown(event) {
    obstacles.push(new Obstacle(event.point, 'red', obstacleAffectRadius));
}


// --- main ---

var bgRect;

var boidSize = 15,
    boidLength = 1,
    boidCenterLength = 0.8,
    boidWidth = 0.6,
    boidColor = "#34c0eb";

var backgroundColor = "#333333";
var numBoids = 100;
var defaultVelocity = 3;

var defaultRelativeWeights = [1, 2, 1, 0.4];
var weightScale = 1; // If we want to scale all of them
var defaultWeights = [];

for (i in defaultRelativeWeights) {
    defaultWeights.push(defaultRelativeWeights[i] * weightScale);
}

var defaultPerceptionRadii = [100, 25];
var defaultMaxSpeed = 5;
var defaultMaxForce = 0.03;

setupBackground(backgroundColor);
view.onResize = function (event) {
    setupBackground(backgroundColor);
}

var defaultBoidTemplate = makeBoidPath(boidSize, boidLength, boidCenterLength,
    boidWidth, boidColor);
var usingSymbol = false;
if (usingSymbol) {
    defaultBoidTemplate = new Symbol (defaultBoidTemplate);
}

var boids = [];
var obstacles = [];
var obstacleAffectRadius = 20;
var lookAhead = 20;

for (var i = 0; i < numBoids; i++) {
    var newPosition = Point.random() * view.size;
    var newVelocity = new Point({
        length: defaultVelocity,
        angle: Math.random() * 360
    });
    boids.push(new Boid(newPosition, newVelocity, defaultBoidTemplate, defaultWeights, 
        defaultPerceptionRadii, defaultMaxSpeed, defaultMaxForce, usingSymbol));
}

if (!usingSymbol) {
    defaultBoidTemplate.remove();
}

var fpsCounter = new PointText({
    point: [10, 20],
    content: "FPS: ",
    fillColor: "white",
    fontSize: 10
});

var lastFrameTime = Date.now();

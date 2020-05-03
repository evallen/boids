var bgRect;


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
 * Make a new boid Symbol object.
 * Relative distances given in the parameters are from 0-1, and are scaled
 * by `boidSize`. 
 * @param {Number} boidSize The scaling factor that determines the size of 
 *                          the boid.
 * @param {Number} boidLength The relative length of the boid.
 * @param {Number} boidCenterLength The relative length from the tip of the 
 *                                  boid to the back indent.
 * @param {Number} boidWidth The relative width of the boid.
 * @param {String} boidColor The color of the boid.
 * @returns {Symbol} A boid symbol with the specified parameters.
 */
function makeBoidSymbol(boidSize, boidLength, boidCenterLength, boidWidth, boidColor) {
    var boidPath = new paper.Path();

    boidPath.add([0, 0]);  // Nose
    boidPath.add([boidWidth / 2 * boidSize, boidLength * boidSize]);  // Right corner
    boidPath.add([0, boidCenterLength * boidSize]);  // Back indent
    boidPath.add([-boidWidth / 2 * boidSize, boidLength * boidSize]);  // Left corner

    // Turn to face the right direction, since 0 degrees points right.
    boidPath.rotate(90);

    boidPath.closed = true;
    boidPath.fillColor = boidColor;

    return new Symbol(boidPath);
}


/**
 * Create a new Boid.
 * @param {paper.Point} position Where the boid will begin.
 * @param {paper.Point} velocity The velocity vector of the boid.
 * @param {paper.Symbol} boidSymbol A symbol to use to make the boid.
 * @param {Array<Number>} weights A 3-array of weights representing the relative
 *                                  weight of the cohesion, avoidance, and following
 *                                  vectors.
 * @param {Array<Number>} perceptionRadii An array of two numbers: 
 *                                      [perceptionRadius, avoidanceRadius] where perceptionRadius
 *                                      is how far they can see other boids and the avoidanceRadius
 *                                      is the distance within which they will steer clear of other boids.
 * @param {Number} maxSpeed The maximum speed of the boid.
 */
function Boid(position, velocity, boidSymbol, weights, perceptionRadii, maxSpeed) {
    this.velocity = velocity;
    this.instance = boidSymbol.place(position);
    this.instance.pivot = [0, 0];
    this.weights = weights;
    this.perceptionRadius = perceptionRadii[0]
    this.avoidanceRadius = perceptionRadii[1];
    this.maxSpeed = maxSpeed;

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
    }

    /**
     * Update the velocity based on the three rules
     * (cohesion, avoidance, and following).
     */
    this.applyForce = function () {
        this.velocity += this.getCohesionVector() * this.weights[0] +
            this.getAvoidanceVector() * this.weights[1] +
            this.getFollowVector() * this.weights[2];

        // Noise.
        this.velocity += (Point.random() - new Point(.5, .5)) * 2 * .01

        // Progressively speed up birds. 
        this.velocity.length += 0.1;

        if (this.velocity.length > this.maxSpeed) {
            this.velocity.length = this.maxSpeed;
        }
    }

    /**
     * Boids try to remain close to other boids.
     * Considers only boids within a certain radius.
     * Get the corresponding vector.
     */
    this.getCohesionVector = function () {
        var cohesionVector = new Point();
        var numBoidsSeen = 0;
        for (i in boids) {
            var displacement = boids[i].instance.position - this.instance.position;
            if (boids[i] != this && 
                displacement.length < this.perceptionRadius) {
                cohesionVector += displacement.normalize() * 
                                (this.perceptionRadius - displacement.length) / this.perceptionRadius;
                numBoidsSeen++;
            }
        }

        if (numBoidsSeen > 0) {
            cohesionVector /= numBoidsSeen;
        }

        return cohesionVector.normalize();
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
                avoidanceVector -= displacement.normalize() * 
                                (this.avoidanceRadius - displacement.length) / this.avoidanceRadius;
            }
        }

        return avoidanceVector.normalize();
    }


    /**
     * Boids try to match velocity with other boids.
     * Get the corresponding vector.
     */
    this.getFollowVector = function () {
        var followVector = new Point();
        var numBoidsSeen = 0;
        for (i in boids) {
            var displacement = boids[i].instance.position - this.instance.position;
            if (boids[i] != this &&
                displacement.length < this.perceptionRadius) {
                followVector += (boids[i].velocity - this.velocity) * 
                                    (this.perceptionRadius - displacement.length) / this.perceptionRadius;
                numBoidsSeen++;
            }
        }

        if (numBoidsSeen > 0) {
            followVector /= numBoidsSeen;
        }

        return followVector.normalize();
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
}


/**
 * Helper function to find the centroid of a boid. 
 * This is useful because the standard `Path.position` attribute
 * returns the center of the Path's bounding box, which is _not_ the
 * intuitive center of our boid arrow-like object.
 * 
 * Rotate around this, not `boid.position`. 
 * 
 * @param {Path} boid A Path that represents a Boid as created in `makeBoidSymbol`.
 * @returns {Point} The centroid of the boid.
 */
function centroid(boid) {
    var segments = boid.segments;
    var vertex = segments[0].point;
    var opposite = segments[1].point - (segments[1].point - segments[3].point) / 2
    var c = vertex + (opposite - vertex) * 2 / 3;
    return c;
}

// --- main ---

var boidSize = 15,
    boidLength = 1,
    boidCenterLength = 0.8,
    boidWidth = 0.6,
    boidColor = "#34c0eb";

var backgroundColor = "#333333";
var numBoids = 100;
var defaultVelocity = 3;

var defaultRelativeWeights = [1, 1.5, 1];
var weightScale = 0.2; // If we want to scale all of them
var defaultWeights = [];

for (i in defaultRelativeWeights) {
    defaultWeights.push(defaultRelativeWeights[i] * weightScale);
}

var defaultPerceptionRadii = [200, 50];
var defaultMaxSpeed = 7;

setupBackground(backgroundColor);
view.onResize = function (event) {
    setupBackground(backgroundColor);
}

var boidSymbol = makeBoidSymbol(boidSize, boidLength, boidCenterLength,
    boidWidth, boidColor);
var boids = [];
for (var i = 0; i < numBoids; i++) {
    var newPosition = Point.random() * view.size;
    var newVelocity = new Point({
        length: defaultVelocity,
        angle: Math.random() * 360
    });
    boids.push(new Boid(newPosition, newVelocity, boidSymbol, defaultWeights, 
        defaultPerceptionRadii, defaultMaxSpeed));
}




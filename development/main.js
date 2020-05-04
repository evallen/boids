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
 * Updates the screen on every frame.
 */
function onFrame() {
    for (i in boids) {
        boids[i].react(boids, obstacles);
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
    console.log("Trying to add boid");
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

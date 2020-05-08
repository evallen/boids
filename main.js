import Boid from './boid.js';
import Controller from './sidebar.js';  

/**
 * Represents an obstacle that the boids try to avoid. Appears as a red circle.
 */
class Obstacle {

    /**
     * Create a new Obstacle.
     * @param {paper.Point} position The position of the obstacle.
     * @param {paper.Color} color The color of the obstacle.
     * @param {Number} affectRadius The radius the obstacle affects other boids.
     */
    constructor(position, color, affectRadius) {
        this.instance = new Path.Circle(position, 5);
        this.instance.fillColor = color;
        this.affectRadius = affectRadius;
    }
}


export default class Runner {

    /**
     * Initializes the Runner, creating the background + boids and setting up all required
     * event handlers.
     */
    constructor(parameters) {
        // Clear everything and start anew.
        paper.project.activeLayer.removeChildren();

        // Constants.
        this.backgroundColor = "#333333";

        this.boidSize = 30;
        this.boidLength = 1;
        this.boidCenterLength = 0.8;
        this.boidWidth = 0.6;
        this.boidColor = "#34c0eb";
        this.usingSymbol = false;

        this.numBoids = parameters["overall"]["numBoids"]["data"];

        this.defaultVelocity = 3;
        this.maxSpeed = parameters["overall"]["maxSpeed"]["data"];
        this.maxForce = parameters["overall"]["maxForce"]["data"];

        this.obstacleAffectRadius = parameters["overall"]["obstacleAffectRadius"]["data"];

        this.weights = parameters["weights"];
        this.perceptionRadii = parameters["perceptionRadii"];

        // List of objects in the scene.
        this.bgRect;  // Will be initialized later; kept so we can resize it on view resize.
        this.fpsCounter;
        this.boids = [];
        this.obstacles = [];
        this.tool = new paper.Tool();  // For the mouse handler.

        // For FPS tracking.
        this.lastFrameTime;

        // Set up background so that whenever we resize the screen, it still fills all of it.
        this.setupBackground();
        view.onResize = this.setupBackground.bind(this);

        // Set up other handlers.
        view.onFrame = this.onFrame.bind(this);

        tool.onMouseDown = this.onMouseDown.bind(this);

        // We'll use this to generate the path for each individual boid. Will be deleted later
        // if it isn't a Symbol.
        var boidTemplate = this.makeBoidPath(this.boidSize, this.boidLength, 
            this.boidCenterLength, this.boidWidth, this.boidColor);
        if (this.usingSymbol) {
            boidTemplate = new Symbol(boidTemplate);
        }

        // Generate each boid.
        for (var i = 0; i < this.numBoids; i++) {
            var newPosition = Point.random().multiply(view.size);
            var newVelocity = new Point({
                length: this.defaultVelocity,
                angle: Math.random() * 360
            });

            this.boids.push(new Boid(newPosition, newVelocity, boidTemplate, this.weights,
                this.perceptionRadii, this.maxSpeed, this.maxForce, this.usingSymbol));
        }

        if (!this.usingSymbol) {
            boidTemplate.remove();
        }

        this.makeFPSCounter();

        this.lastFrameTime = Date.now();
        paper.view.draw();
    }

    /**
     * Generate the FPS counter text. This will be updated in the onFrame handler.
     */
    makeFPSCounter() {
        this.fpsCounter = new PointText({
            point: [10, 20],
            content: "FPS: ",
            fillColor: "white",
            fontSize: 10
        });
    }

    /**
     * Create obstacles when the mouse is clicked.
     */
    onMouseDown(event) {
        this.obstacles.push(new Obstacle(event.point, 'red', this.obstacleAffectRadius));
    }

    /**
     * Updates the screen on every frame.
     */
    onFrame() {
        for (let i in this.boids) {
            this.boids[i].react(this.boids, this.obstacles);
        }
        for (let i in this.boids) {

            this.boids[i].update();
        }

        var nowTime = Date.now();
        this.fpsCounter.content = "FPS: " + Math.round(1000 / (nowTime - this.lastFrameTime));
        this.lastFrameTime = nowTime;
    }


    /**
     * Sets up a large rectangle that covers the screen to act
     * as the background with the specified color.
     * Also sets up the view's resize handler to automatically
     * adjust the background when the window is resized.
     */
    setupBackground() {
        this.bgRect = new paper.Path.Rectangle(new paper.Point(), view.size);
        this.bgRect.fillColor = this.backgroundColor;
        this.bgRect.sendToBack();
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
     * @returns {paper.Path} A boid path with the specified parameters.
     */
    makeBoidPath(boidSize, boidLength, boidCenterLength, boidWidth, boidColor) {
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

}

/**
 * Main: Begin everything when the window is ready.
 */
window.onload = function () {
    paper.install(window);
    var canvas = document.getElementById("canvas");
    paper.setup(canvas);

    // Reserved words: 'doc' and 'data'.
    let defaultParameters = {
        overall: {
            doc: "Overall simulation parameters.",
            numBoids: {
                doc: "The number of boids to simulate.",
                data: 70
            },
            maxSpeed: {
                doc: "The maximum speed of each boid.",
                data: 6
            },
            maxForce: {
                doc: "The maximum steering force each boid can produce. " + 
                        "This should be low for natural behavior.",
                data: 0.03
            },
            obstacleAffectRadius: {
                doc: "How far boids will try to stay away from obstacles.",
                data: 100
            }
        },
        weights: {
            doc: "How much each boid will react to various factors.",
            cohesion: {
                doc: "Causes boids to fly towards other boids within `followRadius`.",
                data: 1
            },
            avoidance: {
                doc: "Causes boids to fly away from nearby boids within `avoidRadius` (don't crash!).",
                data: 4
            },
            following: {
                doc: "Causes boids to try to match velocities with other boids within `followRadius`. " + 
                     "This means that they will try to match speed and direction.",
                data: 2
            },
            obstacles: {
                doc: "Causes boids to avoid obstacles they see ahead.",
                data: 0.4
            }
        },
        perceptionRadii: {
            doc: "How far boids can see.",
            followRadius: {
                doc: "Boids will fly towards and match velocities with other boids within this distance.",
                data: 100
            },
            avoidRadius: {
                doc: "Boids will fly away from boids within this distance.",
                data: 30
            }
        }
    }

    new Controller(defaultParameters);
}


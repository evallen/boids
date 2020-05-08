export default class Boid {
    /**
     * Create a new Boid.
     * @param {paper.Point} position Where the boid will begin.
     * @param {paper.Point} velocity The velocity vector of the boid.
     * @param {*} boidTemplate A path or symbol to copy to make the boid (specify which in `asSymbol`).
     * @param {Object} weights An object containing the following entries: "cohesion", "avoidance", "following",
     *                          and "obstacles" to represent weights for each.
     * @param {Object} perceptionRadii An object containing entries "followRadius" and "avoidRadius"
     *                                  where followRadius is how far they can see other boids and
     *                                  "avoidRadius" is the distance within which they will steer
     *                                  clear of other boids.
     * @param {Number} maxSpeed The maximum speed of the boid.
     * @param {Number} maxForce The maximum force on the boid.
     * @param {Boolean} asSymbol Whether or not to use boidTemplate as a symbol (if false, we'll clone it). 
     */
    constructor(position, velocity, boidTemplate, weights, perceptionRadii, maxSpeed, maxForce, asSymbol) {
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
        this.followRadius = perceptionRadii["followRadius"]["data"];
        this.avoidRadius = perceptionRadii["avoidRadius"]["data"];
        this.maxSpeed = maxSpeed;
        this.maxForce = maxForce;

        /**
         * Figure out what to do for the Boid. 
         * We do this because we want to figure out
         * the new velocity but NOT move before we've calculated
         * the changes for each boid.
         */
        this.react = function (boids, obstacles) {
            this.updateVelocity(boids, obstacles);
        }

        /**
         * Move the boid for one tick. 
         * Should be called after this.react().
         */
        this.update = function () {
            this.instance.rotation = this.velocity.angle;
            this.instance.position = this.instance.position.add(this.velocity);
            this.checkBorders();
            this.instance.fillColor = {
                hue: this.velocity.angle,
                saturation: 1,
                lightness: 0.6
            };
        }

        this.applyForce = function (force) {
            this.velocity = this.velocity.add(force);
        }

        /**
         * Update the velocity based on the four rules
         * (cohesion, avoidance, following, and obstacles).
         */
        this.updateVelocity = function (boids, obstacles) {
            let cohesion = this.getCohesionVector(boids).multiply(this.weights["cohesion"]["data"]);
            let avoidance = this.getAvoidanceVector(boids).multiply(this.weights["avoidance"]["data"]);
            let follow = this.getFollowVector(boids).multiply(this.weights["following"]["data"]);
            let obstacleVec = this.getObstacleVector(obstacles).multiply(this.weights["obstacles"]["data"]);

            let noise = Point.random().subtract(new Point(.5, .5)).multiply(2 * .1);

            this.applyForce(cohesion);
            this.applyForce(avoidance);
            this.applyForce(follow);
            this.applyForce(obstacleVec);
            this.applyForce(noise);

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
            var steer = desired.subtract(this.velocity);
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
        this.getCohesionVector = function (boids) {
            var centerOfMass = new Point();
            var numBoidsSeen = 0;
            for (let i in boids) {
                var displacement = boids[i].instance.position.subtract(this.instance.position);
                if (displacement.length < this.followRadius) {
                    centerOfMass = centerOfMass.add(boids[i].instance.position);
                    numBoidsSeen++;
                }
            }

            if (numBoidsSeen > 0) {
                centerOfMass = centerOfMass.divide(numBoidsSeen);
            }

            return this.getSteer(centerOfMass.subtract(this.instance.position));
        }

        /**
         * Boids try to avoid collisions with other boids.
         * Get the corresponding vector.
         */
        this.getAvoidanceVector = function (boids) {
            var avoidanceVector = new Point();

            // Avoid boids. 

            for (let i in boids) {
                var displacement = boids[i].instance.position.subtract(this.instance.position);
                if (boids[i] != this &&
                    displacement.length < this.avoidRadius) {
                    avoidanceVector = avoidanceVector.subtract(
                        displacement.normalize().divide(displacement.length));
                }
            }

            return this.getSteer(avoidanceVector);
        }


        /**
         * Get the vector pointing away from nearby obstacles.
         */
        this.getObstacleVector = function (obstacles) {
            var obstacleVector = new Point();
            var closestDist = 99999999999;

            for (let i in obstacles) {
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
                var disp = obstacles[i].instance.position.subtract(this.instance.position);

                // Find orthogonal projection from the hitscan line to the obstacle.
                var perp = disp.subtract(this.velocity.multiply(
                    ((disp.dot(this.velocity) / (this.velocity.length * this.velocity.length)))));

                if (perp.length < obstacles[i].affectRadius) {
                    // On a hit
                    if (disp.length < closestDist) {
                        closestDist = disp.length;
                        obstacleVector = perp.multiply(-1);
                    }
                }
            }

            // return this.getSteer(obstacleVector);
            if (obstacleVector.length > 0) {
                obstacleVector = obstacleVector.normalize();
            }
            return obstacleVector;
        }


        /**
         * Boids try to match velocity with other boids.
         * Get the corresponding vector.
         */
        this.getFollowVector = function (boids) {
            var avgVelocity = new Point();
            var numBoidsSeen = 0;
            for (let i in boids) {
                var displacement = boids[i].instance.position.subtract(this.instance.position);;
                if (boids[i] != this &&
                    displacement.length < this.followRadius) {
                    avgVelocity = avgVelocity.add(boids[i].velocity);
                    numBoidsSeen++;
                }
            }

            if (numBoidsSeen > 0) {
                avgVelocity.divide(numBoidsSeen);
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
}
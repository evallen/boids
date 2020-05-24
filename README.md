# boids
A simulation of flocking birds using the famous Boids algorithm by Craig Reynolds!
View it [here](https://evallen.github.io/boids).

## What are boids?
"Boids" are small, abstract creatures designed to represent flocking animals, such as birds or fish. They follow some very simple rules that can combine to form beautiful emergent behavior. 

The rules are simple: 
1. **Cohesion:** Fly towards other boids.
2. **Avoidance:** Fly away from nearby boids (they don't want to crash!).
3. **Following:** Attempt to match your velocity vector (speed _and_ direction) with other boids.

This simulation incorporates a few extra features and parameters, such as the ability to add obstacles that the boids will avoid
and the ability to set "perception radii" (how far each boid can see other boids). 

## Show me the boids!
Try it [here](https://evallen.github.io/boids). While the web application is designed to work on all devices, it works best on
computer monitors that you use a mouse with. Click anywhere on the screen to place an obstacle, and tinker with the settings
to change the boids' behavior. 
Changing the weights around are especially fun. 

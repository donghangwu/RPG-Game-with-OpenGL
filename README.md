## Team Members

<li>Donghang Wu     605346965
<li>JieXuan Fang    
<li>Wei Du   


## Design and Implementation:
controls:
'w'     : move forward
'a'     : move left
'd'     : move right
's'     : move back
'space' : jump
Move Mouse: Change direction

'c'     : randomly spawns monster
'f'     : shot arrow
'o'     : increase arrow initial speed
'p'     : decrease arrow initial speed
'['     : increase gravity
']'     : decrease gravity


## Advanced Features

### Collision Dection
Detect the contaction between the player(camera) with the monsters, Trees and Fence
the player will be blocked by the Tree and Fence. When the player is contacted by
the monster you lose and the game will restart.
The player can shot arrow, if the arrow hits the monster, the monster will disappear


## Physics-based simulation
#### Gravitation simulation
simulate real-world graviation with the arrow

#### Projectile motion
simluate projectile motion for the arrow, and the user can change the initial
speed of the arrow
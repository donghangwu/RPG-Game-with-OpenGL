## Team Members

<li>Donghang Wu     605346965
<li>JieXuan Fang    805378130
<li>Wei Du          805330794


## Design and Implementation:
| Keys  | Functionality |
| --- | --- |
| 'w' | move forward |
| 'a' | move left | 
| 's' | move back | 
| 'd' | move right |
| 'space' | Jump | 
| 'Move Mouse' | Change direction | 
| 'c' | randomly spawns monster |  
| 'f' | shot arrow | 
| 'i' | Up the shot angle | 
| 'k' | Down the shot angle | 
| 'o' | increase arrow initial speed | 
| 'p' | decrease arrow initial speed |  
| '[' | increase gravity | 
| ']' | decrease gravity | 


## How to play
Use WASD to move around, space to jump, move mouse the change the direction, 
use f to shot an arrow, avoid being contacted by the monsters
or you will be died. Use i k to adjust the arrow shot angle, use o p to adjust the arrow initial speed. Use [ ] to adjust the gravity.

<br/>
<br/>


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

### References:
Object File: https://www.turbosquid.com/3d-model/free/trees/obj?synonym=tree
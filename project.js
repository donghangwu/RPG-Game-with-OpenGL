import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Texture,Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

var blocked =false;
var tree_blocked = false;
var mouse_x=0,mouse_y=0;
var forward = false, backward = false;
// Camera coordinate system 
let my_cam=Mat4.look_at(vec3(0, 0, 0), vec3(0, 0, -1), vec3(0, 1, 0));
//test_cam is the current position of the camera
let test_cam=Mat4.identity();
const Mouse_Picking = defs.Movement_Controls =
    class Mouse_Picking extends Scene {
        // **Movement_Controls** is a Scene that can be attached to a canvas, like any other
        // Scene, but it is a Secondary Scene Component -- meant to stack alongside other
        // scenes.  Rather than drawing anything it embeds both first-person and third-
        // person style controls into the website.  These can be used to manually move your
        // camera or other objects smoothly through your scene using key, mouse, and HTML
        // button controls to help you explore what's in it.
        constructor() {
            super();
            const data_members = {
                roll: 0, look_around_locked: true,
                thrust: vec3(0, 0, 0), pos: vec3(0, 0, 0), z_axis: vec3(0, 0, 0),
                radians_per_frame: 1 / 200, meters_per_frame: 20, speed_multiplier: 1
            };
            Object.assign(this, data_members);

            this.mouse_enabled_canvases = new Set();
            this.will_take_over_graphics_state = true;
        }

        set_recipient(matrix_closure, inverse_closure) {
            // set_recipient(): The camera matrix is not actually stored here inside Movement_Controls;
            // instead, track an external target matrix to modify.  Targets must be pointer references
            // made using closures.
            this.matrix = matrix_closure;
            this.inverse = inverse_closure;
        }

        reset(graphics_state) {
            // reset(): Initially, the default target is the camera matrix that Shaders use, stored in the
            // encountered program_state object.  Targets must be pointer references made using closures.
            this.set_recipient(() => graphics_state.camera_transform,
                () => graphics_state.camera_inverse);
        }

        add_mouse_controls(canvas) {
            // add_mouse_controls():  Attach HTML mouse events to the drawing canvas.
            // First, measure mouse steering, for rotating the flyaround camera:

            this.mouse = {"from_center": vec(0, 0)};
            const mouse_position = (e, rect = canvas.getBoundingClientRect()) =>
                vec(e.clientX - (rect.left + rect.right) / 2, e.clientY - (rect.bottom + rect.top) / 2);
           
           
                // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
            document.addEventListener("mouseup", e => {
                this.mouse.anchor = undefined;
            });
            canvas.addEventListener("mousemove", e => {
                e.preventDefault();
                this.mouse.anchor = mouse_position(e);
            });
            canvas.addEventListener("mousemove", e => {
                e.preventDefault();
                this.mouse.from_center = mouse_position(e);
                //console.log("mouse",mouse_x,mouse_y);
            });
            canvas.addEventListener("mouseout", e => {
                if (!this.mouse.anchor) this.mouse.from_center.scale_by(0)
            });
            document.addEventListener("mousemove", e=>{
                mouse_x = e.movementX;
                mouse_y = e.movementY;
            });


            canvas.onclick = () => canvas.requestPointerLock();


        }



        show_explanation(document_element) {
        }

        make_control_panel() {
            // make_control_panel(): Sets up a panel of interactive HTML elements, including
            // buttons with key bindings for affecting this scene, and live info readouts.
            this.control_panel.innerHTML += "Click and drag the scene to spin your viewpoint around it.<br>";
            this.live_string(box => box.textContent = "- Position: " + Mat4.inverse(test_cam)[0][3].toFixed(2)
                + "  " +Mat4.inverse(test_cam)[2][3].toFixed(2) + "blocked:" + blocked
                + "   " + "tree_blocked: " + tree_blocked);

            this.new_line();
            // The facing directions are surprisingly affected by the left hand rule:
            this.z_axis[2]=0
            this.z_axis[0]=1
            console.log("facing,",this)
            this.live_string(box => box.textContent = "- Facing: " + ((this.z_axis[0] > 0 ? "West " : "East ")
                + (this.z_axis[1] > 0 ? "Down " : "Up ") + (this.z_axis[2] > 0 ? "North" : "South")));
            this.new_line();
            this.new_line();

            this.key_triggered_button("Up", [" "], () => {this.thrust[1] = -6;}, undefined, () => {this.thrust[1] = 0;this.thrust[2] = 0});
            this.key_triggered_button("Forward", ["w"], () => {forward = true}, undefined, () => forward = false)

                       // if(!blocked && !tree_blocked){this.thrust[2] = 1}}, undefined, () => this.thrust[2] = 0);
            this.new_line();
            this.key_triggered_button("Left", ["a"], () => this.thrust[0] = 1, undefined, () => this.thrust[0] = 0);
            this.key_triggered_button("Back", ["s"], () => backward = true, undefined, () => backward = false);
            this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0);
            this.new_line();
            this.key_triggered_button("Down", ["z"], () => this.thrust[1] = 1, undefined, () => this.thrust[1] = 0);

            const speed_controls = this.control_panel.appendChild(document.createElement("span"));
            speed_controls.style.margin = "30px";
            this.key_triggered_button("-", ["o"], () =>
                this.speed_multiplier /= 1.2, undefined, undefined, undefined, speed_controls);
            this.live_string(box => {
                box.textContent = "Speed: " + this.speed_multiplier.toFixed(2)
            }, speed_controls);
            this.key_triggered_button("+", ["p"], () =>
                this.speed_multiplier *= 1.2, undefined, undefined, undefined, speed_controls);
            this.new_line();
            this.key_triggered_button("Roll left", [","], () => this.roll = 1, undefined, () => this.roll = 0);
            this.key_triggered_button("Roll right", ["."], () => this.roll = -1, undefined, () => this.roll = 0);
            this.new_line();
            //this.key_triggered_button("(Un)freeze mouse look around", ["f"], () => this.look_around_locked ^= 1, "#8B8885");
            this.new_line();
            this.key_triggered_button("Go to world origin", ["r"], () => {
                this.matrix().set_identity(4, 4);
                this.inverse().set_identity(4, 4)
            }, "#8B8885");
            this.new_line();

            this.key_triggered_button("Look at origin from front", ["1"], () => {
                this.inverse().set(Mat4.look_at(vec3(0, 0, 10), vec3(0, 0, 0), vec3(0, 1, 0)));
                this.matrix().set(Mat4.inverse(this.inverse()));
            }, "#8B8885");
            this.new_line();
            this.key_triggered_button("from right", ["2"], () => {
                this.inverse().set(Mat4.look_at(vec3(10, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0)));
                this.matrix().set(Mat4.inverse(this.inverse()));
            }, "#8B8885");
            this.key_triggered_button("from rear", ["3"], () => {
                this.inverse().set(Mat4.look_at(vec3(0, 0, -10), vec3(0, 0, 0), vec3(0, 1, 0)));
                this.matrix().set(Mat4.inverse(this.inverse()));
            }, "#8B8885");
            this.key_triggered_button("from left", ["4"], () => {
                this.inverse().set(Mat4.look_at(vec3(-10, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0)));
                this.matrix().set(Mat4.inverse(this.inverse()));
            }, "#8B8885");
            this.new_line();
            this.key_triggered_button("Attach to global camera", ["Shift", "R"],
                () => {
                    this.will_take_over_graphics_state = true
                }, "#8B8885");
            this.new_line();
        }

        first_person_flyaround(radians_per_frame, meters_per_frame, leeway = 70) {
            // (Internal helper function)
            // Compare mouse's location to all four corners of a dead box:
            const offsets_from_dead_box = {
                plus: [this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway],
                minus: [this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway]
            };
            // Apply a camera rotation movement, but only when the mouse is
            // past a minimum distance (leeway) from the canvas's center:
            if (!this.look_around_locked)
                // If steering, steer according to "mouse_from_center" vector, but don't
                // start increasing until outside a leeway window from the center.
                for (let i = 0; i < 2; i++) 
                {                                     // The &&'s in the next line might zero the vectors out:
                    let o = offsets_from_dead_box,
                        velocity = ((o.minus[i] > 0 && o.minus[i]) || (o.plus[i] < 0 && o.plus[i])) * radians_per_frame;
                    // On X step, rotate around Y axis, and vice versa.
                    this.matrix().post_multiply(Mat4.rotation(-velocity, i, 1 - i, 0));
                    
                    this.inverse().pre_multiply(Mat4.rotation(+velocity, i, 1 - i, 0));
                }
            this.matrix().post_multiply(Mat4.rotation(-.1 * this.roll, 0, 0, 1));
            this.inverse().pre_multiply(Mat4.rotation(+.1 * this.roll, 0, 0, 1));
            //Now apply translation movement of the camera, in the newest local coordinate frame.
            let future_origin_offset = (0, 0, 0);

            this.matrix().post_multiply(Mat4.translation(...this.thrust.times(-meters_per_frame)));
            this.inverse().pre_multiply(Mat4.translation(...this.thrust.times(+meters_per_frame)));
            //console.log("matrix",this.matrix(),"invserse",this.inverse())
            test_cam=this.inverse()
            if(this.thrust[1]===-6)
            {
                this.thrust[1]=0
                setTimeout(() => { 
                    this.thrust[1]=6
                    this.matrix().post_multiply(Mat4.translation(...this.thrust.times(-meters_per_frame)));
                    this.inverse().pre_multiply(Mat4.translation(...this.thrust.times(+meters_per_frame)));
                    this.thrust[1]=0;
                }, 120)
                
        //         setTimeout(() => {   
        //             this.thrust[1]=0
        //             this.matrix().post_multiply(Mat4.translation(...this.thrust.times(-meters_per_frame)));
        //             this.inverse().pre_multiply(Mat4.translation(...this.thrust.times(+meters_per_frame)));
        //             console.log("hello",this.matrix(),this.inverse())
        // }, 50 );
                
                // console.log("up\n\n")
                // this.matrix().post_multiply(Mat4.translation(...this.thrust.times(-meters_per_frame)));
                // this.inverse().pre_multiply(Mat4.translation(...this.thrust.times(+meters_per_frame)));
                
                 
            }

            let new_pos = Mat4.inverse(test_cam);
            let pos_x = new_pos[0][3];
            let pos_z = new_pos[2][3];
            blocked = (pos_x < -68 || pos_x > 69 || pos_z < -69 || pos_z > 69);
        }


        third_person_arcball(radians_per_frame) {


            let dragging_vector = vec(mouse_x, mouse_y).times(25);

            mouse_x = mouse_y = 0;

            // Don't do anything if the mouse didn't move
            if( dragging_vector.norm() <= 0 )
            return;
            let leeway = 70
            // const offsets_from_dead_box = {
            //     plus: [this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway],
            //     minus: [this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway]
            // };
            const offsets_from_dead_box = {
                plus: [dragging_vector[0] + leeway, dragging_vector[1] + leeway],
                minus: [dragging_vector[0] - leeway, dragging_vector[1] - leeway]
            };

            for (let i = 0; i < 2; i+=2) {                                     // The &&'s in the next line might zero the vectors out:
            let o = offsets_from_dead_box,
                velocity = ((o.minus[i] > 0 && o.minus[i]) || (o.plus[i] < 0 && o.plus[i])) * radians_per_frame;
            // On X step, rotate around Y axis, and vice versa.
            this.matrix().post_multiply(Mat4.rotation(-velocity, i, 1 - i, 0));
            this.inverse().pre_multiply(Mat4.rotation(+velocity, i, 1 - i, 0));
        }
        test_cam=this.inverse()
        //console.log("test:",test_cam)
        my_cam=this.pos;
        //console.log(my_cam)
          

        }

        display(context, graphics_state, dt = graphics_state.animation_delta_time / 1000) {
            // The whole process of acting upon controls begins here.
            //update thrust according to the state of the game.
            if(!blocked && !tree_blocked && forward)
                this.thrust[2] = 1;
            else if (backward)
                this.thrust[2] = -1;
            else
                this.thrust[2] = 0;

            const m = this.speed_multiplier * this.meters_per_frame,
                r = this.speed_multiplier * this.radians_per_frame;

            if (this.will_take_over_graphics_state) {
                this.reset(graphics_state);
                this.will_take_over_graphics_state = false;
            }

            if (!this.mouse_enabled_canvases.has(context.canvas)) {
                this.add_mouse_controls(context.canvas);
                this.mouse_enabled_canvases.add(context.canvas)
            }
            // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
            this.first_person_flyaround(dt * r, dt * m);
            // Also apply third-person "arcball" camera mode if a mouse drag is occurring:
            if (this.mouse.anchor)
                this.third_person_arcball(dt * r);
            // Log some values:
            this.pos = this.inverse().times(vec4(0, 0, 0, 1));
            this.z_axis = this.inverse().times(vec4(0, 0, 1, 0));
        }
    }

    
export class Shape_From_File extends Shape {                                   // **Shape_From_File** is a versatile standalone Shape that imports
                                                                               // all its arrays' data from an .obj 3D model file.
    constructor(filename) {
        super("position", "normal", "texture_coord");
        // Begin downloading the mesh. Once that completes, return
        // control to our parse_into_mesh function.
        this.load_file(filename);
    }

    load_file(filename) {                             // Request the external file and wait for it to load.
        // Failure mode:  Loads an empty shape.
        return fetch(filename)
            .then(response => {
                if (response.ok) return Promise.resolve(response.text())
                else return Promise.reject(response.status)
            })
            .then(obj_file_contents => this.parse_into_mesh(obj_file_contents))
            .catch(error => {
                this.copy_onto_graphics_card(this.gl);
            })
    }

    parse_into_mesh(data) {                           // Adapted from the "webgl-obj-loader.js" library found online:
        var verts = [], vertNormals = [], textures = [], unpacked = {};

        unpacked.verts = [];
        unpacked.norms = [];
        unpacked.textures = [];
        unpacked.hashindices = {};
        unpacked.indices = [];
        unpacked.index = 0;

        var lines = data.split('\n');

        var VERTEX_RE = /^v\s/;
        var NORMAL_RE = /^vn\s/;
        var TEXTURE_RE = /^vt\s/;
        var FACE_RE = /^f\s/;
        var WHITESPACE_RE = /\s+/;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            var elements = line.split(WHITESPACE_RE);
            elements.shift();

            if (VERTEX_RE.test(line)) verts.push.apply(verts, elements);
            else if (NORMAL_RE.test(line)) vertNormals.push.apply(vertNormals, elements);
            else if (TEXTURE_RE.test(line)) textures.push.apply(textures, elements);
            else if (FACE_RE.test(line)) {
                var quad = false;
                for (var j = 0, eleLen = elements.length; j < eleLen; j++) {
                    if (j === 3 && !quad) {
                        j = 2;
                        quad = true;
                    }
                    if (elements[j] in unpacked.hashindices)
                        unpacked.indices.push(unpacked.hashindices[elements[j]]);
                    else {
                        var vertex = elements[j].split('/');

                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);
                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);
                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);

                        if (textures.length) {
                            unpacked.textures.push(+textures[((vertex[1] - 1) || vertex[0]) * 2 + 0]);
                            unpacked.textures.push(+textures[((vertex[1] - 1) || vertex[0]) * 2 + 1]);
                        }

                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 0]);
                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 1]);
                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 2]);

                        unpacked.hashindices[elements[j]] = unpacked.index;
                        unpacked.indices.push(unpacked.index);
                        unpacked.index += 1;
                    }
                    if (j === 3 && quad) unpacked.indices.push(unpacked.hashindices[elements[0]]);
                }
            }
        }
        {
            const {verts, norms, textures} = unpacked;
            for (var j = 0; j < verts.length / 3; j++) {
                this.arrays.position.push(vec3(verts[3 * j], verts[3 * j + 1], verts[3 * j + 2]));
                this.arrays.normal.push(vec3(norms[3 * j], norms[3 * j + 1], norms[3 * j + 2]));
                this.arrays.texture_coord.push(vec(textures[2 * j], textures[2 * j + 1]));
            }
            this.indices = unpacked.indices;
        }
        this.normalize_positions(false);
        this.ready = true;
    }

    draw(context, program_state, model_transform, material) {               // draw(): Same as always for shapes, but cancel all
        // attempts to draw the shape before it loads:
        if (this.ready)
            super.draw(context, program_state, model_transform, material);
    }
}









    
const {Cube, Axis_Arrows, Textured_Phong} = defs
export class Project extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            bullet:new defs.Cube(),
            square:new defs.Cube(),
            sign: new Check(),
            cross: new Crosshair(),
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            // TODO:  Fill in as many additional shape instances as needed in this key/value table.
            //        (Requirement 1)   
            sun: new defs.Subdivision_Sphere(4),
            planet_1: new defs.Subdivision_Sphere(4),
            map: new Ground(),
            sky: new defs.Subdivision_Sphere(4),
            fence :new Shape_From_File("assets/fence.obj"),
            low_tree :new Shape_From_File("assets/low_poly_tree.obj"),
            bow :new Shape_From_File("assets/Bow.obj"),
            Pokemon:new Shape_From_File("assets/Pokemon.obj"),
            monster:new Shape_From_File("assets/Zealot.obj"),
            arrow :new Shape_From_File("assets/arrow.obj"),
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#f9d71c")}),
            test2: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            // TODO:  Fill in as many additional material objects as needed in this key/value table.
            //        (Requirement 4)
            sun: new Material(new Textured_Phong(),
                {ambient: 1,specularity:0, diffusivity: 0, color: hex_color("#f9d71c")}),
            planet_1: new Material(new Textured_Phong(),
                {specularity:1,ambient: 1,diffusivity:1, color: hex_color("#FF0000")}),
            ring: new Material(new Ring_Shader()),

            map_text: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/grass_t.jpg")
            }),
            day_sky_text: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/sky_t2.jpg") 
            }),
            night_sky_text: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/star_t.jpg") 
            }),
            fence: new Material(new Textured_Phong(), {
                color: hex_color("#a64a2b"),
                ambient: .1, diffusivity: 1, specularity: 0.5,
                //texture: new Texture("assets/fence_text.jpg") 
            }),
            bow: new Material(new Textured_Phong(), {
                color: hex_color("#a64a2b"),
                ambient: .1, diffusivity: .1, specularity: 1,
                //texture: new Texture("assets/fence_text.jpg") 
            }), 
            tree: new Material(new Textured_Phong(), {
                color: hex_color("#00b300"),
                ambient: .1, diffusivity: 1, specularity: 0.5,
                //texture: new Texture("assets/fence_text.jpg") 
            }),
            monster: new Material(new Textured_Phong(), {
                //color: hex_color("#000000"),
                ambient: .1, diffusivity: 1, specularity: 0.5,
                //texture: new Texture("assets/fence_text.jpg") 
            }),
            Zealot: new Material(new Textured_Phong(), {
                color: hex_color("#6a0dad"),
                ambient: .1, diffusivity: 1, specularity: 0.5,
                texture: new Texture("assets/Zealot_emissive.png") 
            }),
            arrow: new Material(new Textured_Phong(), {
                color: hex_color("#a64a2b"),
                ambient: .1, diffusivity: 0, specularity: .5,
                //texture: new Texture("assets/fence_text.jpg") 
            }),

            
        }
        this.draw_bullet=true;
        this.creating_bullet = false;
        this.bullet_info = [];//added by Wei Du
        this.spawning_creature = true;//added by Wei Du : [init_time, , init_pos, gravity]
        this.creature_info = [];//added by Wei Du

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 10), vec3(0, 0, 0), vec3(0, 5, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Shoot", ["f"], () => {
            this.draw_bullet=true;
            this.creating_bullet = true;
            console.log("shoot!\n\n")
        });
        this.key_triggered_button("spawn monsters", ["c"], () => {
            this.spawning_creature=true;

            console.log("creature spawned!\n\n")
        });
        this.new_line();
        this.new_line();
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new Mouse_Picking());
            // Define the global camera and projection matrices, which are stored in program_state.
            //c=this.initial_camera_location.times(Mat4.rotation(Math))
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        let sun_tran=Mat4.identity().times(Mat4.rotation(t/5  , 0, 0, 1))
        .times(Mat4.translation(100, 0, 1))
        .times(Mat4.scale(5,5,5)) 
        var light_position = vec4(sun_tran[0][3], sun_tran[1][3], sun_tran[2][3], 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 100000)];


        
  
        
        
        const yellow = hex_color("#fac91a");
        let model_transform = Mat4.identity()

        //the sun is roating around the z axis
        

        //transformation for the sky
        let sky_cover = Mat4.identity()
                    //.times(Mat4.rotation(Math.PI / 2, 1, 0, 0))
                    .times(Mat4.scale(300,300,250))
                    .times(Mat4.rotation(t/20  , 1, 0, 1));
       
        this.shapes.sun.draw(context, program_state, sun_tran, this.materials.sun);

        //sunset change the lighting
        if(sun_tran[1][3]<-2)
        {
            //blocked=true;
            console.log("sunset!")
            program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1)];
            this.shapes.sky.draw(context, program_state, sky_cover, this.materials.night_sky_text);

        }
        else
        {
            //blocked=false;
            program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 10000)];
            this.shapes.sky.draw(context, program_state, sky_cover, this.materials.day_sky_text);
        }



        this.shapes.sign.draw(context, program_state, model_transform, this.materials.map_text);

        //draw the ground
        this.shapes.map.draw(context, program_state, model_transform, this.materials.map_text);


        let low_tree_tran=[]
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(22,0,10)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[0], this.materials.tree);
        
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(12,0,10)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[1], this.materials.tree);
        
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(12,0,-33)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[2], this.materials.tree);
        
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(36,0,22)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[3], this.materials.tree);
        
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(16,0,14)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[4], this.materials.tree);
        
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(-23,0,26)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[5], this.materials.tree);
        
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(-12,0,20)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[6], this.materials.tree);
        
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(-49,0,-20)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[7], this.materials.tree);

        low_tree_tran.push(Mat4.identity().times(Mat4.translation(49,0,50)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[8], this.materials.tree);
        
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(59,0,-20)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[9], this.materials.tree);
        
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(35,0,-23)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[10], this.materials.tree);
        
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(57,0,21)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[11], this.materials.tree);
       
        low_tree_tran.push(Mat4.identity().times(Mat4.translation(46,0,30)))
        this.shapes.low_tree.draw(context, program_state, low_tree_tran[12], this.materials.tree);

        //testing to see if player is blocked by tree
        let player_pos = Mat4.inverse(test_cam);
        let tree_pos = Mat4.identity();
        tree_blocked = false;
        for(var i = 0; i < low_tree_tran.length; i++){
            tree_pos = low_tree_tran[i];
            let d = (player_pos[0][3] - tree_pos[0][3])**2 + (player_pos[2][3] - tree_pos[2][3])**2;
            if(d < 20) {
                tree_blocked = true;
            }
        }
        // let monster_tran = Mat4.identity().times(Mat4.translation(30,0,10))
        // this.shapes.monster.draw(context, program_state, monster_tran, this.materials.Zealot);
        
        //  monster_tran = monster_tran.times(Mat4.translation(30,0,10)).times(Mat4.scale(30,0,10))
        // this.shapes.arrow.draw(context, program_state, monster_tran, this.materials.arrow);


        // Draw bullet-- added by Wei Du
        if (this.creating_bullet){
            // bullet_info : [init_time, init_speed, init_pos, gravity]
            this.bullet_info.push([t,30,Mat4.inverse(test_cam),0.98]);
            this.creating_bullet = false;
        }
        for (let i = 0; i< this.bullet_info.length; i++){
            let parabola = Mat4.translation(0,
                this.bullet_info[i][3]*(t-this.bullet_info[i][0])*(-t+this.bullet_info[i][0]),
                -5+this.bullet_info[i][1]*(-t+this.bullet_info[i][0]));

            this.shapes.arrow.draw(context, program_state,
                                                             // I just randomly chose my size of bullet
                this.bullet_info[i][2].times(parabola.times((Mat4.rotation(Math.PI/3,1,0,0)).times((Mat4.scale(1.5,1,1.5))))),
                this.materials.arrow);

            //implementation of collision check with monsters
            //--added by Jiexuan Fang
            for(let j = 0; j< this.creature_info.length; j++) {
                let distance = vec4(0, 0, 0, 1);
                distance = this.bullet_info[i][2].minus(this.creature_info[j][2]
                    .times(Mat4.translation(0,-2,0))).times(distance);
                if (distance.norm() < 8) {
                    this.creature_info.splice(j, 1);
                    this.bullet_info.splice(i,1);
                }
            }
        }
        // delete a bullet if it's fired certain amount of times ago, here I chose 5 sec
         while (this.bullet_info.length>0 && t-this.bullet_info[0][0] > 5){
            this.bullet_info.shift();
        }
        // end of Draw bullet-- added by Wei Du



         // Draw monster-- added by Wei Du
         if (this.spawning_creature){
            // creature_info : [init_time, speed, pos, chasing_player, min_chase_distance, max_chase_distance, facing_trans]
            // here I chose them to chase the player if player is whinin 40 units nearby
            this.creature_info.push([t,1,Mat4.translation(0,0,0),true, 4, 40,Mat4.identity()]);
            this.spawning_creature = false;
        }
        for (let i = 0; i< this.creature_info.length; i++){
            let distance = vec4(0,0,0,1);
            distance = Mat4.inverse(test_cam).minus(this.creature_info[i][2]).times(distance);
            if (this.creature_info[i][3]){
                if (distance.norm() > this.creature_info[i][4] && distance.norm() <= this.creature_info[i][5]){
                    distance = distance.normalized();
                    this.creature_info[i][2] =
                        Mat4.translation(
                            distance[0]*dt*this.creature_info[i][1],
                            distance[1]*dt*this.creature_info[i][1],
                            distance[2]*dt*this.creature_info[i][1]
                        ).times(this.creature_info[i][2]);
                    this.creature_info[i][6] = Matrix.of(
                        [ distance[0], 0, -distance[2], 0],
                        [ 0, 1, 0, 0],
                        [distance[2], 0, distance[0], 0],
                        [ 0, 0, 0, 1]
                    );

                }
            }
            this.shapes.monster.draw(context, program_state,
                Mat4.identity()
                .times(this.creature_info[i][2]).times(this.creature_info[i][6]).times((Mat4.rotation(Math.PI/2,0,1,0))),
                this.materials.Zealot);
        }
        // de-spawn if it's created certain amount of times ago, here I chose 30 sec
        while (this.creature_info.length>0 && t-this.creature_info[0][0] > 30){
            this.creature_info.shift();
        }

        //fences
        for(var z=-70,l=-70,r=69;z<70;z++)
        {
            let fence_tranr = Mat4.identity()
            .times(Mat4.translation(l,-2.5,z))
            .times(Mat4.scale(1,2,1))
            .times(Mat4.rotation(Math.PI/2,0,1,0))
            this.shapes.fence.draw(context, program_state, fence_tranr, this.materials.fence);

            let fence_tranl = Mat4.identity()
            .times(Mat4.translation(r,-2.5,z))
            .times(Mat4.scale(1,2,1))
            .times(Mat4.rotation(Math.PI/2,0,1,0))
            this.shapes.fence.draw(context, program_state, fence_tranl, this.materials.fence);

        }
        for(var i=-70,j=-70,k=69;i<70;i++)
        {
            let fence_tranr = Mat4.identity()
            .times(Mat4.translation(i,-2.5,-j))
            .times(Mat4.scale(1,2,1))
            this.shapes.fence.draw(context, program_state, fence_tranr, this.materials.fence);

            let fence_tranl = Mat4.identity()
            .times(Mat4.translation(i,-2.5,-k))
            .times(Mat4.scale(1,2,1))
            this.shapes.fence.draw(context, program_state, fence_tranl, this.materials.fence);

        }
        



        // object follows the camera
        
        let left=Mat4.inverse(test_cam)
        let right =Mat4.inverse(test_cam)
        let desired=Mat4.inverse(test_cam)


        desired=desired.times(Mat4.scale(0.001,0.001,0.15))

        ///console.log("desired:",desired)
        this.shapes.planet_1.draw(context, program_state, desired, this.materials.planet_1);

        right=right.times(Mat4.translation(3.5,0,-10)).times(Mat4.rotation(-Math.PI/2,0,1,0))
                    .times(Mat4.rotation(Math.PI/5,0,0,1))
                    .times(Mat4.scale(1.5,1.5,1.5))
        this.shapes.bow.draw(context, program_state, right, this.materials.bow);


    
    }


}



class Ground extends Shape{
    constructor()
    {
        super("position", "normal", "texture_coord");
        this.draw_ground();
    }

    draw_ground()
    {
        // for(var i=-70;i<70;i++)
        // {
        //     for(var j=-70;j<70;j++)
        //     {
        //         defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(i,-5,j))));
        //     }
        //
        // }
        //just render one big scaled cube to make things faster.
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(0,-5,0).times(Mat4.scale(140,0,140)))))
     }

}

class Crosshair extends Shape{
    constructor()
    {
        super("position", "normal", "texture_coord");
        this.draw_ground();
    }

    draw_ground()
    {
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(-2,0,2).times(Mat4.scale(0.1,1,0.1)))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(0,2,2).times(Mat4.scale(0.1,1,0.1)))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(2,0,2).times(Mat4.scale(0.1,1,0.1)))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(0,-2,2).times(Mat4.scale(0.1,1,0.1)))));
       
    }

}

class Check extends Shape{
    constructor()
    {
        super("position", "normal", "texture_coord");
        this.draw_ground();
    }

    draw_ground()
    {
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(0,0,0))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(0,2,0))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(0,4,0))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(0,6,0))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(0,8,0))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(-2,0,0))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(-4,0,0))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(2,0,0))));
        defs.Cube.insert_transformed_copy_into(this, [],((Mat4.translation(4,0,0))));

    }

}







class Gouraud_Shader extends Shader {


    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
          
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
          
        }`;
    }
}


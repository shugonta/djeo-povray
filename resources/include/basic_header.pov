#version 3.6;
global_settings{ assumed_gamma 1.0 }
#default{ finish{ ambient 0.1 diffuse 0.9 }} 
//--------------------------------------------------------------------------
#include "colors.inc"
#include "textures.inc"
#include "glass.inc"
#include "metals.inc"
#include "golds.inc"
#include "stones.inc"
#include "woods.inc"
#include "shapes.inc"
#include "shapes2.inc"
#include "functions.inc"
#include "math.inc"
#include "transforms.inc"

#include "basic_trees.inc"
#include "trees_planting.inc"
#include "roof.inc"
#include "materials.inc"

#declare D = 0.001;

// sun
light_source{
        <1500,2500,-2500>
        color White
}

// sky 
plane{
        <0,1,0>,1 hollow  
        texture{
                pigment{
                        bozo turbulence 0.92
                        color_map {
                                [0.00 rgb <0.20, 0.20, 1.0>*0.9]
                                [0.50 rgb <0.20, 0.20, 1.0>*0.9]
                                [0.70 rgb <1,1,1>]
                                [0.85 rgb <0.25,0.25,0.25>]
                                [1.0 rgb <0.5,0.5,0.5>]
                        }
                        scale<1,1,1.5>*2.5
                        translate< 0,0,0>
                }
                finish {ambient 1 diffuse 0}
        }      
        scale 10000
}

// ground
plane {
        <0,1,0>, 0 
        texture{
                pigment{ color rgb<0.35,0.65,0.0>*0.72 }
                normal { bumps 0.75 scale 0.015 }
                finish { phong 0.1 }
        }
}
/*
// fog on the ground
fog {
        fog_type   2
        distance   50
        color      White
        fog_offset 0.1
        fog_alt    1.5
        turbulence 1.8
}
*/

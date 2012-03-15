#declare Asphalt = texture{
        pigment{ color rgb<1,1,1>*0.3}
        normal { bumps 0.5 scale 0.005}
        finish { diffuse 0.9 phong 0.1}
}

#declare Footway = texture{
        pigment{ color rgb< 0.90, 0.78, 0.60>}
        normal {
                pigment_pattern{
                        brick 
                        color rgb 0.2, 
                        color rgb 0.8 
                        scale <0.05,0.06,0.06> 
                        translate <0.0, 0.1, 0.0>
                }
                0.20
        }
        finish { diffuse 0.9 phong 0.1 }
}

#declare Stripes = texture{
        pigment{ color rgb<1,1,1>*1.1}
        //normal { bumps 0.5 scale 0.005}
        finish { 
                diffuse 0.9
                phong 0.5
        }
}

#declare Wall_Texture_Outside = texture {
        pigment{ color rgb<1,1,1>*1.1}
        normal { bumps 0.5 scale 0.005} 
        finish { phong 1}
}
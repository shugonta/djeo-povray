#declare Roof_Texture = 
// layered texture!!!
      texture {
                pigment{ color Scarlet*1.3}
                normal { gradient z scallop_wave scale<1,1,0.15>} 
                finish { phong 1}
              } // end of texture
 
      texture { 
                 pigment{
                         gradient x 
                         color_map{[0.00 color Clear]
                                   [0.90 color Clear]
                                   [0.95 color White*0.1]
                                   [1.00 color White*0.1]
                                  }
                          scale 0.25
                        }
                 finish { phong 1}
              } // end of texture
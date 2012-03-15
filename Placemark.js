define([
	"dojo/_base/declare",
	"dojo/_base/lang", // mixin, hitch, isString
	"dojo/_base/array", // forEach
	"djeo/_base",
	"djeo/util/_base",
	"djeo/util/bbox",
	"djeo/Style" // calculateStyle
], function(declare, lang, array, djeo, u, bbox){
	
var dotProduct2 = function(v1, v2) {
	return v1[0]*v1[0] + v2[1]*v2[1]
};

// calculate z component or cross product of 2 vectors
var crossProductZ = function(v1, v2) {
	return v1[0]*v2[1]-v1[1]*v2[0];
};

var vectorLength = function(v) {
	return Math.sqrt( dotProduct2(v, v) );
};

var normalizeVector2 = function(v) {
	v_ = vectorLength(v);
	v[0] /= v_;
	v[1] /= v_;
	return v;
};

var normalToVector2 = function(v) {
	var n = [v[1], -v[0]];
	return normalizeVector2(n);
};

// is point inside _convex_ quadrangle?
var isPointInsidePolygon = function(point, polygonPoints) {
	var p = polygonPoints,
		s1 = [ p[1][0]-p[0][0], p[1][1]-p[0][1] ],
		s2 = [ p[2][0]-p[1][0], p[2][1]-p[1][1] ],
		s3 = [ p[3][0]-p[2][0], p[3][1]-p[2][1] ],
		s4 = [ p[4][0]-p[3][0], p[4][1]-p[3][1] ]
	;
	// check if rectangle vertices go clockwise or counterclockwise
	// we calculate cross product of s1 and s2
	var clockWise = crossProductZ(s1, s2) > 0 ? false: true
		result = true;
	;
	for (var i=0,numSegments=polygonPoints.length-1; i<numSegments; i++) {
		var v1 = [ p[i+1][0] - p[i][0], p[i+1][1] - p[i][1] ],
			// v2 is formed by two vertices: begin: p[i], end: point (i.e. function argument)
			v2 = [ point[0]-p[i][0], point[1]-p[i][1]],
			crossZ = crossProductZ(v1, v2)
		;
		if ( (clockWise && crossZ>0) || (!clockWise && crossZ<0) ) {
			result = false;
			break;
		}
	}
	return result;
};

var convertPointTo3D = function(p, height) {
	if (height === undefined) {
		height = 0;
	}
	return [p[0], p[1], height]
};

var calculateStripeEnd = function(
		/* point on the road LineString */p,
		/* point on the left road end */p1,
		/* point on the right road end */ p2,
		/* absolute position of a stripe end on the vector p1-p (negative) or p2-p (positive) */ absPosition,
		/* relative position (always positive) of a stripe end on the vector p1-p or p2-p */ relPosition) {

	// shall we take left or right road end to calculate the left stripe end ?
	var _p = (absPosition<0) ? p1 : p2;
	return [ p[0] + relPosition*(_p[0]-p[0]), p[1] + relPosition*(_p[1]-p[1]) ];
};

return declare(null, {
	
	constructor: function(kwArgs) {
		lang.mixin(this, kwArgs);
	},
	
	render: function(feature, stylingOnly, theme) {
		this._render(feature, stylingOnly, theme);
	},
	
	_render: function(feature, stylingOnly, theme) {
		if (!feature.visible) return;
		//TODO: disconnect connections and then reconnect them
		var coords = feature.getCoords();
		if (!coords) {
			feature.invalid = true;
			return;
		}
		var style = djeo.calculateStyle(feature, theme);
		var handler = style.handler;
		if (handler) {
			var isHandlerString = lang.isString(handler);
			if (isHandlerString) {
				handler = this[handler];
			}
			handler.call(isHandlerString ? this : this.engine, feature, style.handlerOptions || style);
		}
	},
	
	makeBuilding: function(feature, kwArgs) {
		var coords = feature.getCoords();
		this.engine.prism(0, kwArgs.height, coords[0], {texture: kwArgs.wallTexture});
		this.makeRoof(feature, kwArgs);
	},
	
	makeRoad: function(feature, kwArgs){
		var coords = feature.getCoords(),
			halfWidth = kwArgs.width/2
		;
		// prepare points for a road prism
		// prism points (in 2D space)
		var points = []
			numPoints = coords.length
		;
		// process the first and the last points
		var p1 = coords[0],
			p2 = coords[numPoints-1],
			v = [p2[0]-p1[0], p2[1]-p1[1]],
			// normal vector to v
			n = normalToVector2(v),
			// length of each segment along the bisector
			l = halfWidth
		;
		// check the location of points on the normal vector relative to v;
		// we use cross product of the normal vector v and n to check if we need to change the sign of l
		crossZ = crossProductZ(v, n);
		if (crossZ < 0) l = -l;
		// add points for the beginning of the road
		points[0] = [p1[0] + l*n[0], p1[1] + l*n[1]];
		points[2*numPoints-1] = [p1[0] - l*n[0], p1[1] - l*n[1]];
		// add points for the end of the road
		points[numPoints-1] = [p2[0] + l*n[0], p2[1] + l*n[1]];
		points[numPoints] = [p2[0] - l*n[0], p2[1] - l*n[1]];
		// add closing point
		points[2*numPoints] = points[0];
		
		if (numPoints > 2) {
			for (var i=1; i<numPoints-1; i++) {
				// current point
				var p = coords[i],
					// point before the current one
					p1 = coords[i-1],
					// point after the current one
					p2 = coords[i+1],
					// the first vector formed by p1 and p
					v1 = [p[0]-p1[0], p[1]-p1[1]],
					// the second vector formed by p2 and p
					v2 = [p2[0]-p[0], p2[1]-p[1]],
					// length of v1
					v1_ = vectorLength(v1),
					// length of v2
					v2_ = vectorLength(v2),
					// check if v1 and v2 are collinear
					crossZ = crossProductZ(v1, v2),
					// bisector for -v1 and v2
					bis = crossZ ?
						//v1 and v2 are NOT collinear
						normalizeVector2([-v1[0]/v1_ + v2[0]/v2_, -v1[1]/v1_ + v2[1]/v2_]) :
						// v1 and v2 are collinear
						// the bisector is also a normal to both v1 and v2
						normalizeVector2([v1[1], -v1[0]]),
					// length of each segment along the bisector
					l
				;

				//v1 and v2 are NOT collinear
				if (crossZ) {
					// find sine of the angle between v1 and the bisector;
					// that angle has the same value as the angle between v2 and the bisector;
					// sin = [a x b]/(|a||b|)
					var sin = Math.abs(crossProductZ(v1, bis))/v1_,
						// length of each segment along the bisector
						l = halfWidth/sin
					;
				}
				// v1 and v2 are collinear
				else {
					l = halfWidth;
				}
				// find points p1 and p2 on the bisector that are part of the prism
				// check the location of p1 and p2 relative to p;
				// we use cross product of v1 and the bisector to check if we need to change the sign of l
				crossZ = crossProductZ(v1, bis);
				if (crossZ < 0) l = -l;
				p1 = [p[0] + l*bis[0], p[1] + l*bis[1]];
				p2 = [p[0] - l*bis[0], p[1] - l*bis[1]];
				points[i] = p1;
				points[i + 2*(numPoints-i) - 1] = p2;
			}
		}
		this.engine.prism(0, kwArgs.highwayHeight, points, {texture: kwArgs.highwayTexture});
		
		// add road stripes
		if (kwArgs.stripes) {
			array.forEach(kwArgs.stripes, function(stripe){
				var stripeHalfWidth = stripe[1]/2,
					leftEndAbs = stripe[0] - stripeHalfWidth,
					leftEndRel = Math.abs(leftEndAbs/halfWidth),
					rightEndAbs = stripe[0] + stripeHalfWidth,
					rightEndRel = Math.abs(rightEndAbs/halfWidth),
					stripePoints = []
				;
				// add points for the beginning of the road
				var p1 = points[0],
					p2 = points[2*numPoints-1]
				;
				stripePoints[0] = calculateStripeEnd(coords[0], p1, p2, leftEndAbs, leftEndRel);
				stripePoints[2*numPoints-1] = calculateStripeEnd(coords[0], p1, p2, rightEndAbs, rightEndRel);
				// add points for the end of the road
				p1 = points[numPoints-1];
				p2 = points[numPoints];
				stripePoints[numPoints-1] = calculateStripeEnd(coords[numPoints-1], p1, p2, leftEndAbs, leftEndRel);
				stripePoints[numPoints] = calculateStripeEnd(coords[numPoints-1], p1, p2, rightEndAbs, rightEndRel);
				// add closing point
				stripePoints[2*numPoints] = stripePoints[0];
				if (numPoints > 2) {
					for (var i=1; i<numPoints-1; i++) {
						// current point on the LineString
						var p = coords[i],
							// point on the left road end
							p1 = points[i],
							// point on the right road end
							p2 = points[i + 2*(numPoints-i) - 1],
							// left stripe end
							s1 = calculateStripeEnd(p, p1, p2, leftEndAbs, leftEndRel),
							// right stripe end
							s2 = calculateStripeEnd(p, p1, p2, rightEndAbs, rightEndRel)
						;
						stripePoints[i] = s1;
						stripePoints[i + 2*(numPoints-i) - 1] = s2;
					}
				}
				
				this.engine.prism(kwArgs.highwayHeight, kwArgs.highwayHeight+kwArgs.stripesHeight, stripePoints, {texture: kwArgs.stripesTexture});
			}, this);
		}
	},
	
	makeRoof: function(feature, kwArgs) {
		// perform some checks
		// check if have rectangle (5 points, segments are nearly perpendicular)
		var p = feature.getCoords()[0];
		// 5 points
		if (p.length != 5) return;
		// segments should nearly perpendicular
		var s1 = [ p[1][0]-p[0][0], p[1][1]-p[0][1] ],
			s2 = [ p[2][0]-p[1][0], p[2][1]-p[1][1] ],
			s3 = [ p[3][0]-p[2][0], p[3][1]-p[2][1] ],
			s4 = [ p[4][0]-p[3][0], p[4][1]-p[3][1] ],
			// length of s1
			s1_ = Math.sqrt(s1[0]*s1[0]+s1[1]*s1[1]),
			// length of s2
			s2_ = Math.sqrt(s2[0]*s2[0]+s2[1]*s2[1]),
			// length of s3
			s3_ = Math.sqrt(s3[0]*s3[0]+s3[1]*s3[1]),
			// length of s4
			s4_ = Math.sqrt(s4[0]*s4[0]+s4[1]*s4[1])
		;
		// calculating angles between segments via dot product
		var cos1 = Math.abs( (s1[0]*s2[0] + s1[1]*s2[1])/s1_/s2_ ),
			cos2 = Math.abs( (s2[0]*s3[0] + s2[1]*s3[1])/s2_/s3_ ),
			cos3 = Math.abs( (s3[0]*s4[0] + s3[1]*s4[1])/s3_/s4_ )
			// there angles are enough
			//cos4 = Math.abs( (s4[0]*s1[0] + s4[1]*s1[1])/s4_/s1_ )
		;
		if (cos1 > 0.01 || cos2 > 0.01 || cos3 > 0.01) return;
		if (Math.abs(s1_-s2_)/s1_<0.001) return; // TODO: process square

		this.engine.union(lang.hitch(this, function(){
			this._makeRoof(feature, kwArgs);
		}), kwArgs.roofTexture/*"pigment {Red}"*/);
	},
	
	_makeRoof: function(feature, kwArgs) {
		var p = feature.getCoords()[0];
		// segments should nearly perpendicular
		var s1 = [ p[1][0]-p[0][0], p[1][1]-p[0][1] ],
			s2 = [ p[2][0]-p[1][0], p[2][1]-p[1][1] ],
			s3 = [ p[3][0]-p[2][0], p[3][1]-p[2][1] ],
			s4 = [ p[4][0]-p[3][0], p[4][1]-p[3][1] ],
			// length of s1
			s1_ = Math.sqrt(s1[0]*s1[0]+s1[1]*s1[1]),
			// length of s2
			s2_ = Math.sqrt(s2[0]*s2[0]+s2[1]*s2[1]),
			// length of s3
			s3_ = Math.sqrt(s3[0]*s3[0]+s3[1]*s3[1]),
			// length of s4
			s4_ = Math.sqrt(s4[0]*s4[0]+s4[1]*s4[1])
		;
		
		if (s1_ < s2_) {
			// find a point that forms roof in the form of triangle on the smallest rectangular segment
			// first we find such a point for the segment s1 and then for the segment s3
			// s1
			// find the middle point of s1 (mp is for middle point)
			var mp = [ (p[0][0]+p[1][0])/2, (p[0][1]+p[1][1])/2 ],
				// normal to s1 (normalized)
				n = normalToVector2(s1)
			;
			// we have 2 candidate points: one is inside the roof rectangle and the other one is outside
			var refPoint1 = [ mp[0] + s1_/2*n[0], mp[1] + s1_/2*n[1] ],
				refPoint2 = [ mp[0] - s1_/2*n[0], mp[1] - s1_/2*n[1] ]
			;
			// find which refPoint is located inside the roof rectangle
			var roofPoint1 = isPointInsidePolygon(refPoint1, p) ? refPoint1 : refPoint2;
			
			// now the same for s3
			mp = [ (p[2][0]+p[3][0])/2, (p[2][1]+p[3][1])/2 ];
			n = normalToVector2(s3);
			refPoint1 = [ mp[0] + s3_/2*n[0], mp[1] + s3_/2*n[1] ];
			refPoint2 = [ mp[0] - s3_/2*n[0], mp[1] - s3_/2*n[1] ];
			var roofPoint2 = isPointInsidePolygon(refPoint1, p) ? refPoint1 : refPoint2;
			roofPoint2 = convertPointTo3D(roofPoint2);
			
			// finally build the polygons (2 triangle and 2 trapezoids)
			var roofHeight = s1_*Math.tan(u.degToRad(kwArgs.roofAngle))/2;
			roofPoint1 = convertPointTo3D(roofPoint1, kwArgs.height + roofHeight);
			roofPoint2 = convertPointTo3D(roofPoint2, kwArgs.height + roofHeight);
			p0 = convertPointTo3D(p[0], kwArgs.height);
			p1 = convertPointTo3D(p[1], kwArgs.height);
			p2 = convertPointTo3D(p[2], kwArgs.height);
			p3 = convertPointTo3D(p[3], kwArgs.height);
			// triangle
			this.engine.polygon([p0, p1, roofPoint1, p0]);
			// trapezoid composed of two triangles
			this.engine.polygon([p1, p2, roofPoint2, p1]);
			this.engine.polygon([p1, roofPoint2, roofPoint1, p1]);
			// triangle
			this.engine.polygon([p2, p3, roofPoint2, p2]);
			// trapezoid composed of two triangles
			this.engine.polygon([p3, p0, roofPoint1, p3]);
			this.engine.polygon([p3, roofPoint1, roofPoint2, p3]);
		}
		else {
			// the same as for the above case
			var mp = [ (p[1][0]+p[2][0])/2, (p[1][1]+p[2][1])/2 ],
				n = normalToVector2(s2),
				refPoint1 = [ mp[0] + s2_/2*n[0], mp[1] + s2_/2*n[1] ],
				refPoint2 = [ mp[0] - s2_/2*n[0], mp[1] - s2_/2*n[1] ],
				roofPoint1 = isPointInsidePolygon(refPoint1, p) ? refPoint1 : refPoint2
			;
			
			// now the same for s4
			mp = [ (p[3][0]+p[4][0])/2, (p[3][1]+p[4][1])/2 ];
			n = normalToVector2(s4);
			refPoint1 = [ mp[0] + s4_/2*n[0], mp[1] + s4_/2*n[1] ];
			refPoint2 = [ mp[0] - s4_/2*n[0], mp[1] - s4_/2*n[1] ];
			var roofPoint2 = isPointInsidePolygon(refPoint1, p) ? refPoint1 : refPoint2;
			roofPoint2 = convertPointTo3D(roofPoint2);
			
			// finally build the polygons (2 triangle and 2 trapezoids)
			var roofHeight = s2_*Math.tan(u.degToRad(kwArgs.roofAngle))/2;
			roofPoint1 = convertPointTo3D(roofPoint1, kwArgs.height + roofHeight);
			roofPoint2 = convertPointTo3D(roofPoint2, kwArgs.height + roofHeight);
			p0 = convertPointTo3D(p[0], kwArgs.height);
			p1 = convertPointTo3D(p[1], kwArgs.height);
			p2 = convertPointTo3D(p[2], kwArgs.height);
			p3 = convertPointTo3D(p[3], kwArgs.height);
			// triangle
			this.engine.polygon([p1, p2, roofPoint1, p1]);
			// trapezoid composed of two triangles
			this.engine.polygon([p2, p3, roofPoint2, p2]);
			this.engine.polygon([p2, roofPoint2, roofPoint1, p2]);
			// triangle
			this.engine.polygon([p3, p0, roofPoint2, p3]);
			// trapezoid composed of two triangles
			this.engine.polygon([p0, p1, roofPoint1, p0]);
			this.engine.polygon([p0, roofPoint1, roofPoint2, p0]);
		}
	},
	
	makeForest: function(feature, kwArgs) {
		var coords = feature.getCoords();
		this.engine.object(this.engine.macro("plantTrees",
			//function(){ this.polygon(coords[0]); },
			function(){ this.prism(0, 1, coords[0]); },
			this.engine.array(kwArgs.trees),
			this.engine.array(kwArgs.ratios),
			kwArgs.treeCellX,
			kwArgs.treeCellZ,
			kwArgs.scaleFactor,
			kwArgs.maxTiltAngle
		));
	},
	
	makeForestProxy: function(feature, kwArgs) {
		var coords = feature.getCoords();
		var bb = bbox.get(feature);
		this.engine.intersection(function(){
			this.isosurface(
				"y - 8.5*f_leopard(3*x,0,3*z) -  2*f_noise3d( mod(x,3)*30, y*45*2.7, mod(z,3)*30 )",
				function(){ this.box(bb[0],0,bb[1],bb[2],100,bb[3]); },
				8,
				kwArgs.treeTexture
			);
			this.prism(0, 100, coords[0]);
		});
	}

});

});

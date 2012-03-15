define([
	"require",
	"dojo/_base/declare", // declare
	"dojo/_base/lang", // isArray, isFunction, hitch
	"dojo/_base/array",
	"djeo/Engine",
	"djeo/_TextEngineMixin",
	"./Placemark",
	"djeo/util/_base",
	"djeo/projection"
], function(require, declare, lang, array, Engine, _TextEngineMixin, Placemark, u, proj){
	
var defaultTilt = 0,
	defaultHeading = 0,
	defaultRange = 100 // meters
;

return declare([Engine, _TextEngineMixin], {
	
	indent: 0,
	
	// area extent
	extent: 0,
	
	outputHeaderUrl: "",

	// default value for this.outputHeaderUrl
	_outputHeaderUrl: "./resources/include/basic_header.pov",

	constructor: function(kwArgs) {
		// initialize basic factories
		this._initBasicFactories(new Placemark({
			map: this.map,
			engine: this
		}));
		
		if (!this.outputHeaderUrl) {
			this.outputHeaderUrl = require.toUrl(this._outputHeaderUrl);
		}
	},
	
	initialize: function(/* Function */readyFunction) {
		// Mercator projection is the default one
		this.map.projection = this.projection || "EPSG:3857";
		this.initialized = true;
		readyFunction();
	},

	matchModuleId: function(dependency) {
		return null;
	},
	
	enableLayer: function(layerId, enabled) {

	},
	
	render: function(/* Boolean */stylingOnly, /* String? */theme) {
		// summary:
		//		Implementation of the render method of djeo.Map
		// stylingOnly:
		//		See description in the render method of djeo.Map
		// theme:
		//		See description in the render method of djeo.Map
		var extent = this.map.getBbox();
		this.extent = extent;
		this.offset = [(extent[0]+extent[2])/2, 0, (extent[1]+extent[3])/2];

		// load file for the output header
		require.getText(this.outputHeaderUrl, true, lang.hitch(this, function(_str){
			this.renderedText = _str;
		}));
		
		// setup camera
		var lookAt = this.map.lookAt;
		if (!(lookAt && lookAt.coords)) return null;
		// look_at is a povray camera parameter
		var look_at = this.map.getCoords(lookAt.coords),
			tilt = u.degToRad(lookAt.tilt !==undefined ? lookAt.tilt : defaultTilt),
			heading = u.degToRad(lookAt.heading !==undefined ? lookAt.heading : defaultHeading)
			range = lookAt.range !== undefined ? lookAt.range: defaultRange,
			location = [
				look_at[0] + range*Math.sin(tilt)*Math.sin(heading),
				look_at[1] + range*Math.sin(tilt)*Math.cos(heading),
				range*Math.cos(tilt)
			]
		;
		// calculating location
		//var location = this.location ? this.map.getCoords(this.location) : [look_at[0]-200, look_at[1]-200, 200];
		this.camera({
			look_at: look_at,
			location: location,
			angle: 90,
			right: "x*image_width/image_height"
		});
		this.map.document._render(stylingOnly, theme);
		
		this.provideOutput();
		return this.renderedText;
	},
	
	write: function(str) {
		this.renderedText += str;
	},
	
	writeln: function(str) {
		if (this.indent) {
			for (var i=0; i<this.indent; i++) {
				this.renderedText += "\t";
			}
		}
		this.renderedText += str + "\n";
	},
	
	writeAttribute: function(attr, value) {
		if (!attr) return;
		var str = attr;
		if (value) {
			str += " ";
			if (lang.isArray(value)) {
				str += this._array2Str(value);
			}
			else {
				str += value;
			}
		}
		this.writeln(str);
	},
	
	array: function(values) {
		var str = "array[" + values.length+"]{" + this._array(values);
		return str + "}";
	},
	
	_array: function(values) {
		var vectors = lang.isArray(values[0]) ? true : false,
			str = vectors ? this._array2Str(values[0]) : values[0]
		;
		for (var i=1, numValues=values.length; i<numValues; i++) {
			str += ", " + (vectors ? this._array2Str(values[i]) : values[i]);
		}
		return str;
	},
	
	_array2Str: function(v) {
		var str = "<" + (v[0]-this.offset[0]) + ",";
		if (v.length == 2) {
			str += (v[1] - this.offset[2]);
		}
		else {
			str += (v[2] - this.offset[1]) + "," + (v[1] - this.offset[2])
		}
		str += ">";
		return str;
	},
	
	texture: function(texture) {
		if (texture) {
			this.writeln("texture{"+texture+"}");
		}
	},
	
	block: function(blockName){
		if (blockName) {
			this.writeln(blockName+"{");
			this.indent++;
		}
		else {
			this.indent--;
			this.writeln("}");
		}
	},
	
	macro: function(name) {
		var content = name+"(";
		var numArguments = arguments.length;
		if (numArguments > 1) {
			for (var i=1; i<numArguments; i++) {
				if (i != 1) {
					content += ",";
				}
				if (lang.isFunction(arguments[i])) {
					this._renderedText = this.renderedText;
					this.renderedText = "";
					arguments[i].call(this);
					content += this.renderedText;
					this.renderedText = this._renderedText;
					this._renderedText = "";
				}
				else {
					content += arguments[i];
				}
			}
		}
		return content+")";
	},
	
	isosurface: function(functionBody, containedBy, maxGradient, texture) {
		this.block("isosurface");
		this.writeln("function{" + functionBody + "}");
		if (lang.isFunction(containedBy)) {
			this._renderedText = this.renderedText;
			this.renderedText = "";
			containedBy.call(this);
			containedBy = this.renderedText;
			this.renderedText = this._renderedText;
			this._renderedText = "";
		}
		this.writeln("contained_by {" + containedBy + "}");
		this.writeAttribute("max_gradient", maxGradient);
		this.texture(texture);
		this.block();
	},
	
	union: function(contentBuilder, texture) {
		this.block("union");
		contentBuilder.call(this);
		this.texture(texture);
		this.block();
	},
	
	intersection: function(contentBuilder, texture) {
		this.block("intersection");
		contentBuilder.call(this);
		this.texture(texture);
		this.block();
	},
	
	object: function(content, texture) {
		this.block("object");
		this.writeln(content);
		this.texture(texture);
		this.block();
	},
	
	box: function(x1, y1, z1, x2, y2, z2, texture) {
		this.block("box");
		this.writeln("<"+(x1-this.offset[0])+","+y1+","+(z1-this.offset[2])+">,<"+(x2-this.offset[0])+","+y2+","+(z2-this.offset[2])+">");
		this.texture(texture);
		this.block();
	},
	
	cylinder: function(x1, y1, z1, x2, y2, z2, radius) {
		this.block("cylinder");
		this.writeln("<"+(x1-this.offset[0])+","+y1+","+(z1-this.offset[2])+">,<"+(x2-this.offset[0])+","+y2+","+(z2-this.offset[2])+">,"+radius);
		//this.texture(texture);
		this.block();
	},
	
	polygon: function(points, texture) {
		this.block("polygon");
		// swap z and y
		var _2D = (points[0].length == 2) ? true : false;
		if (_2D) {
			var _points = [];
			array.forEach(points, function(p){
				_points.push([p[0], p[1], 0]);
			});
			points = _points;
		}
		this.write(points.length+",");
		this.writeln(this._array(points));
		this.block();
	},
	
	prism: function(height1, height2, points, kwArgs) {
		kwArgs = kwArgs || {};
		this.block("prism");
		this.writeAttribute(kwArgs.spline);
		this.writeAttribute(kwArgs.sweep);
		this.writeln(height1+", "+height2+", "+points.length+",");
		this.writeln(this._array(points));
		this.texture(kwArgs.texture);
		this.block();
	},
	
	camera: function(kwArgs) {
		this.block("camera");
		for (var attr in kwArgs) {
			this.writeAttribute(attr, kwArgs[attr])
		}
		this.block();
	}
	
});

});
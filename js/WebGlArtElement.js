/**
 * @fileoverview Base class and subclasses for art elements that use webgl
 * as the rendering element.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.WebGlArtElement');
goog.provide('gfd.WebGlTriElement');
goog.provide('gfd.WebGlPaintElement');

goog.require('gfd.ArtElement');
goog.require('gfd.Color');
goog.require('gfd.Palette');
goog.require('gfd.Random');
goog.require('gfd.RandomPalette');
goog.require('gfd.Rectangle');
goog.require('gfd.Selection');
goog.require('gfd.Serializer');
goog.require('gfd.Triangulate');
goog.require('gfd.WebGlCanvas');
goog.require('gfd.WebGlCanvasListener');

/**
 * An ArtElement that encapsulates a WebGl canvas. It uses a div as a temporary
 * dom element. But gets switched with a canvas when it needs rendering.
 * @param {Number=} opt_allFlags
 * @constructor
 * @extends {gfd.ArtElement}
 * @implements {gfd.WebGlCanvasListener}
 */
gfd.WebGlArtElement = function(opt_allFlags)
{
  gfd.ArtElement.call(this, 'webgl', opt_allFlags);

  /**
   * @type {gfd.WebGlCanvas}
   * @private
   */
  this.gl_ = null;
  
  /**
   * @type {Object}
   * @private
   */
  this.program_ = null;
  
  /**
   * @type {Number}
   * @private
   */
  this.glWidth_ = 0;
  
  /**
   * @type {Number}
   * @private
   */
  this.glHeight_ = 0;
  
  /**
   * A flag to reset gl if internal data has changed.
   * @private
   * @type {boolean}
   */
  this.resetGl_ = false;
  
  /**
   * A projection matrix to apply to any point data rendered. Initially set
   * to an orthogonal matrix in initGl
   * @type {Float32Array}
   * @private
   */
  this.projectionMatrix_ = null;
  
  /**
   * A model view matrix to apply to any point data rendered. Initially set
   * to an orthogonal matrix in initGl
   * @type {Float32Array}
   * @private
   */
  this.modelViewMatrix_ = null;
  
  
  this.hitData_ = null;
  
  /**
   * @type {Boolean}
   * @private
   */
  this.cached_ = false;
  
  /**
   * @type {HTMLCanvasElement}
   * @private
   */
  this.imageCacheEl_ = null;
  
  /**
   * @type {Boolean}
   * @private
   */
  this.needsCache_ = false;
  
  /**
   * @type {Boolean}
   * @private
   */
  this.needsUncache_ = false;
};
goog.inherits(gfd.WebGlArtElement, gfd.ArtElement);


/**
 * A factory method for creating WebGlArtElements so as to not overload
 * resources.
 * @param {gfd.ArtElement.FactoryDelegate} factoryDelegate
 * @param {function(new: gfd.WebGlArtElement)} webGlClass
 * @returns {gfd.WebGlArtElement}
 */
gfd.WebGlArtElement.create = function(factoryDelegate, webGlClass)
{
  // See if we can create a webgl canvas
  if (!gfd.WebGlCanvas.canCreateWebGlCanvas())
  {
    // TODO: instead of just removing the oldest we could just cache it
    factoryDelegate.removeLruOfClass(gfd.WebGlArtElement, 
        gfd.WebGlArtElement.creationFilterFunc);
    
    if (!gfd.WebGlCanvas.canCreateWebGlCanvas()) return null;
  }
  
  return new webGlClass();
};


/**
 * A filter function used in the factory create method so we only remove
 * items that aren't already cached.
 * @param element
 * @param index
 * @param array
 * @returns {boolean}
 */
gfd.WebGlArtElement.creationFilterFunc = function(element, index, array)
{
  return !element.isCached();
};


/** @override */
gfd.WebGlArtElement.prototype.init = function()
{
  return gfd.ArtElement.prototype.init.call(this, document.createElement('div'));
};

/** @override */
gfd.WebGlArtElement.prototype.hit = function(x, y, opt_selection)
{
  var r = this.getRect();
  
  // Read a single pixel of the canvas to see if there is anything drawn to it
  if (this.gl_)
  {
    var gl = this.gl_.getGl();
    var data = this.hitData_ || (this.hitData_ = new Uint8Array(4));
    data[3] = 256; // Set so we can check if an error occurs and fallback
    gl.readPixels(x - r.x, r.height - (y - r.y), 1, 1, gl.RGBA, 
        gl.UNSIGNED_BYTE, data);
    if (data[3] < 256) return data[3] > 1;
  }
  else if (this.imageCacheEl_)
  {
    try
    {
      return this.imageCacheEl_.getContext('2d').
        getImageData(x - r.x, y - r.y, 1, 1).data[3] > 1;
    }
    catch(err){}
  }

  // Hit testing failed try the default method
  return gfd.ArtElement.prototype.hit.call(this, x, y, opt_selection);
};


/** @inheritDoc */
gfd.WebGlArtElement.prototype.serialize = function()
{
  return gfd.ArtElement.prototype.serialize.call(this);
};

/** @inheritDoc */
gfd.WebGlArtElement.prototype.deserialize = function(data)
{
  return gfd.ArtElement.prototype.deserialize.call(this, data);
};

/** @override */
gfd.WebGlArtElement.prototype.disposeInternal = function()
{
  if (this.gl_)
  {
    this.cleanupGl(this.gl_);
    this.releaseGlObjects();
    gfd.WebGlCanvas.releaseWebGlCanvas(this.gl_);
    this.gl_ = null;
  }
  
  this.needsCache_ = false;
  this.cached_ = false;
  
  if (this.imageCacheEl_)
  {
    if (this.imageCacheEl_.parentNode)
    {
      this.imageCacheEl_.parentNode.removeChild(this.imageCacheEl_);
    }
    this.imageCacheEl_.width = this.imageCacheEl_.height = 0;
    this.imageCacheEl_ = null;
  }
  
  gfd.ArtElement.prototype.disposeInternal.call(this);
};

/**
 * Whether the element is currently cached to a 2d canvas.
 * @returns {boolean}
 */
gfd.WebGlArtElement.prototype.isCached = function()
{
  return this.cached_;
};


/** @override */
gfd.WebGlArtElement.prototype.updateTransformImpl = function(transform)
{
  this.transformDataPoints(transform);
  this.refreshGl_ = true;
  return true; // Transform rectangle as well
};

/** @override */
gfd.WebGlArtElement.prototype.updateRectImpl = function(oldRect, newRect)
{
  this.refreshGl_ = true;
};


/**
 * An indication that the subclass plans on caching at any point.
 * @returns {boolean}
 */
gfd.WebGlArtElement.prototype.willCache = function()
{
  return false;
};

/**
 * Called if the element wants to be cached (doesn't plan on adding any more
 * openGL commands.
 */
gfd.WebGlArtElement.prototype.cache = function()
{
  if (!this.cached_ && this.gl_ && this.gl_.isCacheable())
  {
    this.needsCache_ = true;
    this.needsUncache_ = false;
    this.requestRender();
  }
};

/**
 * Called if the element wants to draw more stuff.
 */
gfd.WebGlArtElement.prototype.uncache = function()
{
  if (this.cached_)
  {
    this.needsUncache_ = true;
    this.requestRender();
  }
  
  this.needsCache_ = false;
};

/** @inheritDoc */
gfd.WebGlArtElement.prototype.lostContext = function()
{
  //TODO: what todo here/ hide?
};

/** @inheritDoc */
gfd.WebGlArtElement.prototype.restoredContext = function()
{
  this.refreshGl_ = true;
  this.requestRender();
};

/**
 * Initializes any gl on first setup of gl like enable depth etc.
 */
gfd.WebGlArtElement.prototype.initGl = function(glCanvas)
{
  var gl = glCanvas.getGl();
  gl.viewport(0, 0, this.glWidth_, this.glHeight_);
  gl.useProgram(this.program_);
  this.initUniforms(gl);
};

/**
 * Sets up and gl uniforms that stay the same throughout.
 * @param gl
 */
gfd.WebGlArtElement.prototype.initUniforms = function(gl)
{
  var p = this.projectionMatrix_ || (this.projectionMatrix_ = mat4.create());
  var rect = this.getRect();
  p[0] = 2 / rect.width;
  p[1] = 0;
  p[2] = 0;
  p[3] = 0;
  
  p[4] = 0;
  p[5] = -2 / rect.height;
  p[6] = 0;
  p[7] = 0;
  
  p[8] = 0;
  p[9] = 0;
  p[10] = 1;
  p[11] = 0;
  
  p[12] = -1 - ((rect.x + rect.x) / rect.width);
  p[13] = 1 + ((rect.y + rect.y) / rect.height);
  p[14] = 0;
  p[15] = 1;

  gl.uniformMatrix4fv(gl.getUniformLocation(this.program_, 'upmat'), false, 
      p);
  
  
  p = this.modelViewMatrix_ || (this.modelViewMatrix_ = mat4.create());
  mat4.identity(p);

  gl.uniformMatrix4fv(gl.getUniformLocation(this.program_, 'umvmat'), false, 
      p);
};

/**
 * Cleanup anything done in initGl. Subclasses should override this if they
 * do anything in initGl. Like enable depth, etc.
 */
gfd.WebGlArtElement.prototype.cleanupGl = function() {};

/**
 * Subclasses should override to release any objects they've created in the
 * span between initGl and cleanupGl like vbo's, textures, program, etc.
 * by setting them to null. They will be deleted so retaining references can
 * be misleading.
 */
gfd.WebGlArtElement.prototype.releaseGlObjects = function()
{
  // Override and release any opengl objects
  this.program_ = null;
};

/**
 * This may return the glCanvas or it may not if its cached. If it is cached
 * it will attempt to uncache itself but not until the next loop.
 */
gfd.WebGlArtElement.prototype.getGlCanvas = function()
{
  if (this.cached_)
  {
    this.uncache();
    return null;
  }
  
  return this.gl_;
};

/**
 * @protected
 * The main update loop for gl art elements. Don't override this, instead only
 * override the draw method.
 * @param elapsedTimeInSeconds
 * @param flags
 * @returns {Number}
 */
gfd.WebGlArtElement.prototype.updateImpl = function(elapsedTimeInSeconds, flags)
{
  var rect = this.getRect();
  
  if (this.refreshGl_)
  {
    if (this.gl_) // If we're not cached, then reset everything and re-render
    {
      
      this.cleanupGl(this.gl_);
      this.releaseGlObjects();
      this.gl_.release();
      var canvas = this.gl_.getCanvas();
      canvas.width = this.glWidth_ = rect.width;
      canvas.height = this.glHeight_ = rect.height;
      
      //console.log('WebGlArtElement::refresh gl: ' + rect.width + ', ' + rect.height);
      
      this.initShaders(this.gl_);
      this.initBuffers(this.gl_);
      this.initGl(this.gl_);
      this.needsCache_ = false; // Don't allow it to cache on the update
    }
    else
    {
      this.needsUncache = true; // Flag the implementation that we should uncache
      this.needsCache = false;
    }
    
    this.refreshGl_ = false;
  }
  
  if (this.needsCache_ && this.gl_)
  {
    if (!this.imageCacheEl_) this.imageCacheEl_ = document.createElement('canvas');//new Image();
    this.imageCacheEl_.width = rect.width;
    this.imageCacheEl_.height = rect.height;
    this.imageCacheEl_.getContext('2d').drawImage(this.gl_.getCanvas(), 0, 0, 
        rect.width, rect.height);
    
    this.swapDomEl(this.imageCacheEl_);
    
    // Now release all opengl
    var gl = this.gl_.getGl();
    this.cleanupGl(this.gl_);
    this.releaseGlObjects();
    gfd.WebGlCanvas.releaseWebGlCanvas(this.gl_);
    this.gl_ = null;
    
    this.cached_ = true;
    this.needsCache_ = false;

    flags &= gfd.ArtElement.UpdateFlags.CLEAR_RENDER; // Clear render flag
  }
  else if (!this.cached_ || this.needsUncache_)
  {
    if (!this.gl_) // Here we do uncaching or initialization
    {
      // If uncaching fails flags remain and will try to uncache next time
      if (this.gl_ = gfd.WebGlCanvas.createWebGlCanvas(this, this.willCache()))
      {
        var canvas = this.gl_.getCanvas();

        canvas.width = this.glWidth_ = rect.width;
        canvas.height = this.glHeight_ = rect.height;
        
        if (!this.initShaders(this.gl_))
        {
          throw "WebGlArtElement failed to initialize shaders!";
        }
        
        if (!this.initBuffers(this.gl_))
        {
          throw "WebGlArtElement failed to initialize buffers!";
        }
        
        this.initGl(this.gl_);

        this.swapDomEl(canvas);
        
        this.cached_ = false;
        this.needsUncache_ = false;
      }
    }
    
    if (this.gl_) // Do actual drawing
    {
      var gl = this.gl_.getGl();
      
      if (!this.draw(gl, elapsedTimeInSeconds))
      {
        flags &= gfd.ArtElement.UpdateFlags.CLEAR_RENDER;
      }
    }
  }
  else
  {
    flags &= gfd.ArtElement.UpdateFlags.CLEAR_RENDER;
  }

  return flags;
};


/**
 * Subclasses should override to create any shaders. Return false if an error.
 * @param {gfd.WebGlCanvas} glCanvas
 * @returns {boolean}
 */
gfd.WebGlArtElement.prototype.initShaders = function(glCanvas)
{
  var tmpProgram = glCanvas.createProgram();
  var gl = glCanvas.getGl();

  var vs = gl.createShader(gl.VERTEX_SHADER);
  var fs = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vs, this.getVertexShaderSource());
  gl.shaderSource(fs, this.getFragmentShaderSource());

  gl.compileShader(vs);
  gl.compileShader(fs);

  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS))
  {
      console.log(gl.getShaderInfoLog(vs));
      return false;
  }

  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS))
  {
      console.log(gl.getShaderInfoLog(fs));
      return false;
  }

  gl.attachShader(tmpProgram, vs);
  gl.attachShader(tmpProgram, fs);

  gl.deleteShader(vs);
  gl.deleteShader(fs);

  gl.linkProgram(tmpProgram);

  this.program_ = tmpProgram;

  return true;
};

/**
 * Subclasses should override to provide a custom vertex shader. For the default
 * program.
 * @returns {String}
 */
gfd.WebGlArtElement.prototype.getVertexShaderSource = function()
{
  return [
    "#ifdef GL_ES",
      "precision mediump float;",
    "#endif",
    "uniform float time;",
    "uniform mat4 upmat;",
    "uniform mat4 umvmat;",
    "attribute vec3 pos;",
    "attribute vec4 col;",
    "varying vec3 vPos;",
    "varying vec4 vCol;",
    "void main(void) {",
      "gl_Position = umvmat * upmat * vec4(pos, 1.0);",
      "vCol = col;",
      "vPos = pos;",
    "}"
    ].join("\n");
};

/**
 * Subclasses should override to provide a custom fragment shader for the
 * default program.
 * @returns {String}
 */
gfd.WebGlArtElement.prototype.getFragmentShaderSource = function()
{
  return [
   "precision mediump float;",
   "varying vec3 vPos;",
   "varying vec4 vCol;",
   "void main(void) {",
     //"vec4 col = vec4((vPos + 1.0) / 2.0, 1.0);",
     //"float noise = fract(sin(dot(vPos.xy ,vec2(12.9898,78.233))) * 43758.5453) / 5.0;",
     //"col = mod(col.z, 0.1) > 0.05 ? vCol : (1.0 - col);",
     "gl_FragColor = vCol;",// + noise;//floor(vCol * 4.0) / 4.0;",
   "}"
   ].join("\n");
};

/**
 * Subclasses should override to initialize any buffers on init.
 * @param {gfd.WebGlCanvas} glCanvas
 * @returns {Boolean}
 */
gfd.WebGlArtElement.prototype.initBuffers = function(glCanvas)
{
  return true;
};

/**
 * Subclasses should override to do any drawing on a per-render basis. Return
 * true if more rendering is needed or false to end the render cycle.
 * @param {WebGlCanvasContext}
 * @param elapsedTimeInSeconds
 * @returns {Boolean}
 */
gfd.WebGlArtElement.prototype.draw = function(gl, elapsedTimeInSeconds)
{
  return false;
};











/**
 * One type of webgl brush
 * @constructor
 * @extends {gfd.WebGlArtElement}
 * @implements {gfd.Serializable}
 */
gfd.WebGlTriElement = function()
{
  gfd.WebGlArtElement.call(this);
  
  /**
   * @type {WebGlVertexBufferObject}
   * @private
   */
  this.vbo_ = null;
  /**
   * @type {WebGlVertexBufferObject}
   * @private
   */
  this.cbo_ = null;
  /**
   * @type {Number}
   * @private
   */
  this.numVerts_ = 0;
  
  /**
   * @type {Array.<gfd.Point>}
   * @private
   */
  this.points_ = null;
  
  /**
   * @type {string}
   * @private
   */
  this.mode_ = 'closed';

  /**
   * @type {string}
   * @private
   */
  this.paletteName_;
  
  /**
   * @type {boolean}
   * @private
   */
  this.selected_;
  
  /**
   * @type {gfd.RandomPalette}
   * @private
   */
  this.palette_ = null;
  
  this.time_ = 0;
  
  /**
   * @type {Float32Array}
   * @private
   */
  this.colorBuffer_ = null;
  
  /**
   * Indication that we need to update the color vbo.
   * @type {boolean}
   * @private
   */
  this.paletteChanged_ = false;
  
  this.glLocAPos_ = null;
  this.glLocACol_ = null;
  this.glLocUTime_ = null;
  this.glLocUColor_ = null;
};
goog.inherits(gfd.WebGlTriElement, gfd.WebGlArtElement);

/**
 * @enum {string}
 */
gfd.WebGlTriElement.Mode = 
{
  STATIC: 'static',
  WAVES: 'waves'
};

/**
 * @const
 * @type {string}
 */
gfd.WebGlTriElement.serialId = 'gltri';

// Register for serialization engine
gfd.Serializer.registerClassForId(gfd.WebGlTriElement.serialId, 
    gfd.WebGlTriElement);


/**
 * Initializes the object.
 * @param {gfd.Rectangle=} opt_rect
 * @param {Array.<gfd.Point>=} opt_points
 * @param {number=} opt_paletteSeed
 * @param {string=} opt_mode
 */
gfd.WebGlTriElement.prototype.initWithData = function(opt_rect, opt_points, 
    opt_paletteSeed, opt_mode)
{
  if (gfd.WebGlArtElement.prototype.init.call(this))
  {
    // Analyze data and modify rect
    if (opt_rect)
    {
      //console.log('rect was: ' + opt_rect.x + ', ' + opt_rect.y + ', ' + opt_rect.width + ', ' + opt_rect.height);
      for (var i = 0; i < opt_points.length - 1; i++)
      {
        var dx = opt_points[i].x + (opt_points[i+1].y - opt_points[i].y);
        var dy = opt_points[i].y - (opt_points[i+1].x - opt_points[i].x);//opt_points[ind+1].y - opt_points[ind].y;
        if (dx < 0) dx = 0;
        if (dy < 0) dy = 0;
        opt_rect.extendTo(dx, dy);
        opt_rect.extendTo(dx, dy-20);
        opt_rect.extendTo(dx, dy+20);
        
        //console.log('extend to: ' + dx + ',' + dy);
        
        dx = opt_points[i].x + (opt_points[i+1].y - opt_points[i].y) * 2;
        dy = opt_points[i].y - (opt_points[i+1].x - opt_points[i].x) * 2;;//opt_points[ind+1].y - opt_points[ind].y;
        if (dx < 0) dx = 0;
        if (dy < 0) dy = 0;
        opt_rect.extendTo(dx, dy);
        opt_rect.extendTo(dx, dy-20);
        opt_rect.extendTo(dx, dy+20);
        
        //console.log('extend to: ' + dx + ',' + dy);
      }
      
      //console.log('rect is: ' + opt_rect.x + ', ' + opt_rect.y + ', ' + opt_rect.width + ', ' + opt_rect.height);
      // Init data, no more data can be added later with this brush
      this.setRect(opt_rect);
    }

    
    this.points_ = opt_points;
    
    this.palette_ = new gfd.RandomPalette(opt_paletteSeed);
    this.mode_ = opt_mode || this.mode_;

    return this;
  }
};

/** @inheritDoc */
gfd.WebGlTriElement.prototype.serialize = function()
{
  var obj = gfd.WebGlArtElement.prototype.serialize.call(this);
  
  if (this.points_)
  {
    obj['palsd'] = this.palette_.getSeed();
    obj['pts'] = gfd.Point.flattenArray(this.points_);
    obj['mode'] = this.mode_;
  }
  
  return obj;
};

/** @inheritDoc */
gfd.WebGlTriElement.prototype.deserialize = function(data)
{
  if (gfd.WebGlArtElement.prototype.deserialize.call(this, data))
  {
    return this.initWithData( null, 
                              gfd.Point.unflattenArray(data['pts']), 
                              data['palsd'],
                              data['mode']);
  }
};

/** @inheritDoc */
gfd.WebGlTriElement.prototype.getSerializationId = function()
{
  return gfd.WebGlTriElement.serialId;
};


/** @override */
gfd.WebGlTriElement.prototype.initGl = function(glCanvas)
{
  gfd.WebGlArtElement.prototype.initGl.call(this, glCanvas);
  
  var gl = glCanvas.getGl();

  gl.clearColor(0, 0, 0, 0);

  this.glLocAPos_ = gl.getAttribLocation(this.program_, 'pos');
  this.glLocACol_ = gl.getAttribLocation(this.program_, 'col');
  this.glLocUTime_ = gl.getUniformLocation(this.program_, 'time');
  this.glLocUColor_ = gl.getUniformLocation(this.program_, 'uCol');
};


/** @override */
gfd.WebGlTriElement.prototype.cleanupGl = function(glCanvas)
{
  gfd.WebGlArtElement.prototype.cleanupGl.call(this, glCanvas);
  
  this.glLocAPos_ = null;
  this.glLocACol_ = null;
  this.glLocUTime_ = null;
  this.glLocUColor_ = null;
};

/** @override */
gfd.WebGlTriElement.prototype.setPaletteName = function(p)
{
  if (p !== this.paletteName_)
  {
    this.paletteName_ = p;
    this.paletteChanged_ = true;
    this.uncache();
    this.requestRender();
  }
};


/** @override */
gfd.WebGlTriElement.prototype.select = function(opt_selection)
{
  if (!this.selected_)
  {
    this.selected_ = true;
    this.uncache();
    this.requestRender();
  }
};


/** @override */
gfd.WebGlTriElement.prototype.deselect = function(opt_selection)
{
  if (this.selected_)
  {
    this.selected_ = false;
    this.uncache();
    this.requestRender();
  }
};


/** @override */
gfd.WebGlTriElement.prototype.getVertexShaderSource = function()
{
  var src = [
    "uniform float time;",
    "attribute vec3 pos;",
    "attribute vec4 col;",
    "uniform mat4 upmat;",
    "uniform mat4 umvmat;",
    "uniform vec4 uCol;",
    "varying vec4 vCol;",
    "varying vec3 vPos;",
    "void main(void) {"];
  
  var modeSrc;
  
  switch (this.mode_)
  {
    case gfd.WebGlTriElement.Mode.WAVES:
      modeSrc = ["vec3 newpos = vec3(pos.x, pos.y + sin(pos.x/10.0 + time)*15.0, 0.0);",
                 "gl_Position = umvmat * upmat * vec4(newpos, 1.0);"];
      break;
      
    default:
      modeSrc = ["gl_Position = umvmat * upmat * vec4(pos, 1.0);"];
      break;
  };
  
  src = src.concat(modeSrc, [
                                "vCol = col + uCol;",
                                "vPos = pos;",
                              "}"]);
  
  return src.join('\n');
};


/** @override */
gfd.WebGlTriElement.prototype.initBuffers = function(glCanvas)
{
  var p = this.points_;
  var pl = p.length;
  var numTri = Math.ceil(pl / 1);
  var verts = [];
  var nv = 0;
  for (var i = 0; i < numTri - 1; i++)
  {
    var ind = Math.floor(pl/numTri * i);
    var dx = p[ind+1].x - p[ind].x;
    var dy = p[ind+1].y - p[ind].y;
    verts[nv++] = p[ind].x + dy;
    verts[nv++] = p[ind].y - dx;
    verts[nv++] = 0;
    
    verts[nv++] = p[ind].x + dy * 2;
    verts[nv++] = p[ind].y - dx * 2;
    verts[nv++] = 0;
  }

  this.numVerts_ = nv / 3;
  
  // Create random color for each vert
  if (!this.colorBuffer_ || this.colorBuffer_.length != this.numVerts_)
  {
    this.colorBuffer_ = new Float32Array(this.numVerts_ * 4);
  }
  
  this.paletteChanged_ = true;

  var gl = glCanvas.getGl();
  this.vbo_ = glCanvas.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo_);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  this.cbo_ = glCanvas.createBuffer();
  return true;
};


/** @override */
gfd.WebGlTriElement.prototype.disposeInternal = function()
{
  this.palette_.dispose();
  this.palette_ = null;
  
  gfd.WebGlArtElement.prototype.disposeInternal.call(this);
};


/** @override */
gfd.WebGlTriElement.prototype.collectDataPoints = function(points)
{
  points.push(this.points_);
};


/** @override */
gfd.WebGlTriElement.prototype.releaseGlObjects = function()
{
  gfd.WebGlArtElement.prototype.releaseGlObjects.call(this);
  
  this.vbo_ = null;
  this.cbo_ = null;
  this.numVerts_ = 0;
  this.colorBuffer_ = null;
};


/** @override */
gfd.WebGlTriElement.prototype.willCache = function()
{
  return true;
};


/** @override */
gfd.WebGlTriElement.prototype.draw = function(gl, elapsedTimeInSeconds)
{
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  if (this.paletteChanged_)
  {
    this.paletteChanged_ = false;
    var nc = 0;
    var palette = gfd.Palette.getPaletteByName(this.paletteName_);
    var c = this.palette_.get(palette, 0);
    for (var i = 0; i < this.numVerts_; i++, nc += 4)
    {
      if (i%3 == 0) c = this.palette_.get(palette, i);
      c.fillVec4Array(this.colorBuffer_, nc);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cbo_);
    gl.bufferData(gl.ARRAY_BUFFER, this.colorBuffer_, gl.STATIC_DRAW);
  }

  this.time_ += elapsedTimeInSeconds * 2;
  gl.uniform1f(this.glLocUTime_, this.time_);
  gl.uniform4fv(this.glLocUColor_, this.selected_ ? [1,1,1,1] : [0,0,0,0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo_);
  gl.vertexAttribPointer(this.glLocAPos_, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.cbo_);
  gl.vertexAttribPointer(this.glLocACol_, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(this.glLocACol_);
  gl.enableVertexAttribArray(this.glLocAPos_);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.numVerts_);
  gl.disableVertexAttribArray(this.glLocAPos_);
  gl.disableVertexAttribArray(this.glLocACol_);
  
  // Cache this to an image
  if (this.mode_ === gfd.WebGlTriElement.Mode.WAVES)
  {
    return true;
  }
  else
  {
    this.cache();
    return false;
  }
};










/**
 * Cutout shape.
 * @constructor
 * @extends {gfd.WebGlArtElement}
 * @implements {gfd.Serializable}
 */
gfd.WebGlPaintElement = function()
{
  gfd.WebGlArtElement.call(this, gfd.WebGlPaintElement.UpdateFlags.DATA);
  
  /**
   * @type {Array.<gfd.WebGlPaintElement.Stroke>}
   * @private
   */
  this.strokes_ = [];
  /**
   * @type {Array.<Object>}
   * @private
   */
  this.data_ = [];
  /**
   * Pseudo-randomly generated sequence of random palette indices.
   * @type {gfd.RandomPalette}
   * @private
   */
  this.palette_ = null;

  /**
   * @type {string}
   * @private
   */
  this.paletteName_;
  
  /**
   * @type {int}
   * @private
   */
  this.maxStrokes_ = 8;
  
  /**
   * @type {Object}
   * @private
   */
  this.glLocAPos_ = null;
  
  /**
   * @type {Object}
   * @private
   */
  this.glLocUColor_ = null;
  
  /**
   * @type {Object}
   * @private
   */
  this.glLocUMvMat = null;
  
  /**
   * @type {boolean}
   * @private
   */
  this.hasStencil_ = true;
  
  /**
   * @type {number}
   * @private
   */
  this.time_ = 0;
  
  /**
   * @type {gfd.Selection}
   * @private
   */
  this.selection_ = null;
};
goog.inherits(gfd.WebGlPaintElement, gfd.WebGlArtElement);

/**
 * The serialization id for the WebGlPaintElement
 * @const
 * @type {string}
 */
gfd.WebGlPaintElement.serialId = 'glpnt';

// Register for serialization
gfd.Serializer.registerClassForId(gfd.WebGlPaintElement.serialId, 
    gfd.WebGlPaintElement);

/**
 * Enum for update flags specific to the paint element.
 * @enum {Number}
 */
gfd.WebGlPaintElement.UpdateFlags = {
  DATA: 128,
  CLEAR_DATA: ~128
};

/**
 * @param {boolean} closed
 * @param {Array.<gfd.Point>} points
 * @param {number} rot
 * @param {Array.<number>} angle
 * @param {gfd.Point} center
 * @constructor
 */
gfd.WebGlPaintElement.Stroke = function(closed, points, rot, angle, center)
{
  this.closed = !!closed;
  this.points = points;
  this.rot = rot;
  this.angle = angle;
  this.center = center;
  this.cx = 0;
  this.cy = 0;
  this.primitive = 0;
  this.verts = null;
  this.vbo = null;
};

/**
 * @param {gfd.Rectangle=} opt_rect
 * @param {Array.<gfd.Point>=} opt_points
 * @param {number=} opt_paletteSeed
 * @returns {gfd.WebGlPaintElement}
 */
gfd.WebGlPaintElement.prototype.initWithData = function(opt_rect, opt_points,
    opt_paletteSeed)
{
  if (gfd.WebGlArtElement.prototype.init.call(this))
  {
    if (opt_rect && opt_points)
    {
      this.handleData(opt_rect, opt_points);
    }
    
    this.palette_ = new gfd.RandomPalette(opt_paletteSeed);

    return this;
  }
};


/** @override */
gfd.WebGlPaintElement.prototype.setPaletteName = function(p)
{
  if (p !== this.paletteName_)
  {
    this.paletteName_ = p;
    this.uncache();
    this.requestRender();
  }
};


/** @inheritDoc */
gfd.WebGlPaintElement.prototype.serialize = function()
{
  var obj = gfd.WebGlArtElement.prototype.serialize.call(this);
  
  obj['strokes'] = [];
  
  for (var i = 0; i < this.strokes_.length; i++)
  {
    obj['strokes'].push({ 'c':this.strokes_[i].closed ? 1 : 0,
                          'p':gfd.Point.flattenArray(this.strokes_[i].points),
                          'rot': parseFloat(this.strokes_[i].rot.toFixed(2)),
                          'angle': [  parseFloat(this.strokes_[i].angle[0].toFixed(3)),
                                      parseFloat(this.strokes_[i].angle[1].toFixed(3)),
                                      parseFloat(this.strokes_[i].angle[2].toFixed(3))],
                          'center':[parseFloat(this.strokes_[i].center.x.toFixed(3)),
                                    parseFloat(this.strokes_[i].center.y.toFixed(3))]});
  }
  
  obj['palsd'] = this.palette_.getSeed();
  
  return obj;
};


/** @inheritDoc */
gfd.WebGlPaintElement.prototype.deserialize = function(data)
{
  if (gfd.WebGlArtElement.prototype.deserialize.call(this, data))
  {
    for (var i = 0; i < data['strokes'].length; i++)
    {
      this.strokes_[i] = new gfd.WebGlPaintElement.Stroke(
          !!data['strokes'][i]['c'],
          gfd.Point.unflattenArray(data['strokes'][i]['p']),
          data['strokes'][i]['rot'],
          data['strokes'][i]['angle'],
          new gfd.Point(data['strokes'][i]['center'][0], 
                                  data['strokes'][i]['center'][1]));
    }

    return this.initWithData(null, null, data['palsd']);
  }
};


/** @inheritDoc */
gfd.WebGlPaintElement.prototype.getSerializationId = function()
{
  return gfd.WebGlPaintElement.serialId;
};


/** @override */
gfd.WebGlPaintElement.prototype.disposeInternal = function()
{
  this.data_.length = 0;
  this.palette_.dispose();
  this.palette_ = null;
  this.strokes_.length = 0;
  this.selection_ = null;
  
  gfd.WebGlArtElement.prototype.disposeInternal.call(this);
};


/**
 * Adds a stroke of points.
 * @param {gfd.Rectangle} rect
 * @param {Array.<Object>} points
 */
gfd.WebGlPaintElement.prototype.addStroke = function(rect, points, opt_dontRequestRender)
{
  //If its a closed stroke it should be filled, so determine if its closed
  var firstPoint = points[0];
  var lastPoint = points[points.length - 1];
  var maxDist = Math.sqrt(rect.width * rect.width + rect.height * rect.height);
  var distX = lastPoint.x - firstPoint.x;
  var distY = lastPoint.y - firstPoint.y;
  var closed = (Math.sqrt(distX * distX + distY * distY) < (maxDist * 0.09));
  
  //var strokePoints = this.resampleData(rect, points);

  this.strokes_.push(new gfd.WebGlPaintElement.Stroke(closed,
                                                  points, 
                                                  0, 
                                                  [Math.random() * 1,Math.random() * 1, Math.random() * 1],
                                                  new gfd.Point(rect.x + rect.width / 2, rect.y + rect.height / 2)));

  var glCanvas = this.getGlCanvas();
  if (glCanvas)
  {
    this.initStrokeBuffers(glCanvas, this.strokes_[this.strokes_.length - 1]);
  }
  
  if (!opt_dontRequestRender)
  {
    this.requestRender();
  }
};


/** @override */
gfd.WebGlPaintElement.prototype.collectDataPoints = function(points)
{
  var n = points.length;
  for (var i = this.strokes_.length - 1; i >= 0; --i)
  {
    points[n++] = this.strokes_[i].points;
    points[n++] = this.strokes_[i].center;
  }
};


/**
 * @param {gfd.WebGlCanvas} glCanvas
 * @param {gfd.WebGlPaintElement.Stroke} stroke
 */
gfd.WebGlPaintElement.prototype.initStrokeBuffers = function(glCanvas, stroke)
{
  //console.log('WebGlPaintElement::initStrokeBuffers:' + glCanvas + ' valid: ' + glCanvas.isValid());
  
  var i, gl = glCanvas.getGl();
  var rect = this.getRect();
  var strokeVerts = null;
  var numVerts = 0;
  
  // Try to triangulate it
  if (stroke.closed)
  {
    // TODO: check for intersections, if a single intersection between segments
    // near the start and the end, crop the remaining bits and close it at
    // the intersection. Otherwise the tesselator can't process it below.
    
    var triangleIndices = gfd.Triangulate.process(stroke.points);
    if (triangleIndices)
    {
      strokeVerts = [];

      for (i = 0; i < triangleIndices.length; i++)
      {
        strokeVerts[numVerts++] = stroke.points[triangleIndices[i]].x;
        strokeVerts[numVerts++] = stroke.points[triangleIndices[i]].y;
        strokeVerts[numVerts++] = 0;
      }
    }
    else
    {
      stroke.closed = false;
    }
  }
  
  // If not closed just create a straight line.
  // TODO: Make this look a bit better maybe thickness based on velocity
  if (!stroke.closed)
  {
    var strokeRadius = 20;
    var strokeRadiusX = strokeRadius;//(strokeRadius / this.getRect().width) * 2;
    var strokeRadiusY = strokeRadius;//(strokeRadius / this.getRect().height) * 2;
  
    var l = stroke.points.length;
    var lp = stroke.points[0];
    var np = stroke.points[1];
    
    strokeVerts = [];

    for (i = 1; i < l - 1; i++)
    {
      var p = np;
      np = stroke.points[i+1];
  
      var dx = np.x - lp.x;
      var dy = np.y - lp.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      dx *= strokeRadiusY/dist;// / dist;
      dy *= strokeRadiusX/dist;// / dist;

      strokeVerts[numVerts++] = p.x + dy;
      strokeVerts[numVerts++] = p.y - dx;
      strokeVerts[numVerts++] = -0.1 + Math.random()*0.2;//0.0;
      strokeVerts[numVerts++] = p.x - dy;
      strokeVerts[numVerts++] = p.y + dx;
      strokeVerts[numVerts++] = -0.1 + Math.random()*0.2;//0.0;

      lp = p;
    }
  }
  
  stroke.verts = strokeVerts;
  stroke.primitive = stroke.closed ? gl.TRIANGLES : gl.TRIANGLE_STRIP;

  stroke.cx = 2 * (stroke.center.x - (rect.x + rect.width / 2)) / rect.width;
  stroke.cy = -2 * (stroke.center.y - (rect.y + rect.height / 2)) / rect.height;
  
  if (stroke.vbo && console) console.log('stroke already has vbo!');
  stroke.vbo = glCanvas.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, stroke.vbo);
  // TODO: Should we hold onto the Float32Array to save memory?
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stroke.verts), gl.STATIC_DRAW);
};


/** @override */
gfd.WebGlPaintElement.prototype.updateImpl = function(elapsedTimeInSeconds, flags)
{
  if (flags & gfd.WebGlPaintElement.UpdateFlags.DATA)
  {
    for (var i = 0; i < this.data_.length; i+=2)
    {
      this.addStroke(this.data_[i], this.data_[i+1], true);
    }
 
    this.data_.length = 0;
    flags &= gfd.WebGlPaintElement.UpdateFlags.CLEAR_DATA;
  }
  
  return gfd.WebGlArtElement.prototype.updateImpl.call(this, 
      elapsedTimeInSeconds, flags);
};


/** @override */
gfd.WebGlPaintElement.prototype.handleData = function(rect, points)
{
  var curRect = this.getRect();
  
  if (this.strokes_.length < this.maxStrokes_ && (!curRect || curRect.intersects(rect)))
  {
    // BUG: Rect ends up cropping the object based on rotation, so need to either
    // figure out the extent of an objects rotation, or make rect full screen.
    this.setRect((curRect ? curRect.clone().union(rect) : rect).expand(40));
    this.data_.push(rect);
    this.data_.push(points);
    this.requestUpdate(gfd.WebGlPaintElement.UpdateFlags.DATA);
    return true;
  }
  
  return false;
};


/** @override */
gfd.WebGlPaintElement.prototype.select = function(opt_selection)
{
  this.selection_ = opt_selection || new gfd.Selection(this);
  this.uncache();
  this.requestRender();
};


/** @override */
gfd.WebGlPaintElement.prototype.deselect = function(opt_selection)
{
  if (this.selection_)
  {
    this.selection_ = null;
    this.uncache();
    this.requestRender();
  }
};


/** @override */
gfd.WebGlPaintElement.prototype.initBuffers = function(glCanvas)
{
  for (var i = 0; i < this.strokes_.length; i++)
  {
    this.initStrokeBuffers(glCanvas, this.strokes_[i]);
  }
  
  return true;
};


/** @override */
gfd.WebGlPaintElement.prototype.releaseGlObjects = function()
{
  gfd.WebGlArtElement.prototype.releaseGlObjects.call(this);
  
  for (var i = 0; i < this.strokes_.length; i++)
  {
    this.strokes_[i].vbo = null;
  }
};


/** @override */
gfd.WebGlPaintElement.prototype.initGl = function(glCanvas)
{
  gfd.WebGlArtElement.prototype.initGl.call(this, glCanvas);
  
  var gl = glCanvas.getGl();
  gl.clearStencil(0);
  gl.clearDepth(0);
  gl.clearColor(0, 0, 0, 0);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.STENCIL_TEST);
  gl.disable(gl.CULL_FACE);
  
  this.glLocAPos_ = gl.getAttribLocation(this.program_, 'pos');
  this.glLocUColor_ = gl.getUniformLocation(this.program_, 'uColor');
  this.glLocUMvMat_ = gl.getUniformLocation(this.program_, 'umvmat');
  this.hasStencil_ = gl.getParameter(gl.STENCIL_BITS) > 1;
};


/** @override */
gfd.WebGlPaintElement.prototype.cleanupGl = function(glCanvas)
{
  gfd.WebGlArtElement.prototype.cleanupGl.call(this, glCanvas);
  
  this.glLocAPos_ = null;
  this.glLocUColor_ = null;
  this.glLocUMvMat_ = null;

  var gl = glCanvas.getGl();
  gl.disable(gl.STENCIL_TEST);
};


/** @override */
gfd.WebGlPaintElement.prototype.willCache = function()
{
  return true;
};


/** @override */
gfd.WebGlPaintElement.prototype.getVertexShaderSource = function()
{
  return [
    "uniform mat4 upmat;",
    "uniform mat4 umvmat;",
    "attribute vec3 pos;",
    "void main(void) {",
      "gl_Position = umvmat * upmat * vec4(pos, 1.0);",
    "}"
    ].join("\n");
};

/** @override */
gfd.WebGlPaintElement.prototype.getFragmentShaderSource = function()
{
  return [
   "precision mediump float;",
   "uniform vec4 uColor;",
   "void main(void) {",
     "gl_FragColor = uColor;",
   "}"].join("\n");
};


/** @override */
gfd.WebGlPaintElement.prototype.draw = function(gl, elapsedTimeInSeconds)
{
  var i, pal = 0, 
      tempVec = [0,0,0], 
      palette = gfd.Palette.getPaletteByName(this.paletteName_);
  
  gl.clear(gl.STENCIL_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
  gl.enableVertexAttribArray(this.glLocAPos_);
  
  if (this.hasStencil_) gl.stencilFunc(gl.ALWAYS, 0, 0xFF);
  
  if (!this.selection_ && this.hasStencil_)
  {
    // Draw out each stroke and accumulate overlaps on the stencil buffer
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    
    for (i = 0; i < this.strokes_.length; i++)
    {
      var stroke = this.strokes_[i];
      
      // Update rotations here
      stroke.rot += elapsedTimeInSeconds / 5;
      
      gl.bindBuffer(gl.ARRAY_BUFFER, stroke.vbo);
      gl.vertexAttribPointer(this.glLocAPos_, 3, gl.FLOAT, false, 0, 0);

      mat4.identity(this.modelViewMatrix_);
      tempVec[0] = stroke.cx; tempVec[1] = stroke.cy;
      mat4.translate(this.modelViewMatrix_, tempVec);
      mat4.rotate(this.modelViewMatrix_, stroke.rot, stroke.angle);
      tempVec[0] = -stroke.cx; tempVec[1] = -stroke.cy;
      mat4.translate(this.modelViewMatrix_, tempVec);
 
      gl.uniformMatrix4fv(this.glLocUMvMat_, false, this.modelViewMatrix_);
      
      gl.drawArrays(stroke.primitive, 0, stroke.verts.length / 3);
    }
  }
  
  if (this.hasStencil_) gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

  for (i = 0; i < this.strokes_.length; i++)
  {
    var stroke = this.strokes_[i];
    
    // Bind the vbo
    gl.bindBuffer(gl.ARRAY_BUFFER, stroke.vbo);
    
    // Select the vbo
    gl.vertexAttribPointer(this.glLocAPos_, 3, gl.FLOAT, false, 0, 0);

    // Draw the shape to any blank areas
    if (!this.selection_ && this.hasStencil_) gl.stencilFunc(gl.EQUAL, 1, 0xFF);
    
    var c = this.selection_ ? gfd.Color.WHITE : 
              this.palette_.get(palette, pal = 12 * i);

    gl.uniform4f(this.glLocUColor_, c.nr, c.ng, c.nb, 1.0);
    
    mat4.identity(this.modelViewMatrix_);
    
    tempVec[0] = stroke.cx; tempVec[1] = stroke.cy;
    mat4.translate(this.modelViewMatrix_, tempVec);
    mat4.rotate(this.modelViewMatrix_, stroke.rot, stroke.angle);
    tempVec[0] = -stroke.cx; tempVec[1] = -stroke.cy;
    mat4.translate(this.modelViewMatrix_, tempVec);

    gl.uniformMatrix4fv(this.glLocUMvMat_, false, this.modelViewMatrix_);

    gl.drawArrays(stroke.primitive, 0, stroke.verts.length / 3);
    
    if (!this.selection_ && this.hasStencil_)
    {
      // Now draw the shape to any overlapping areas, this could actuallly more
      // than strokes_.length due to self-overlapping polygons
      for (var j = 2; j <= 12; j++)
      {
        var c = this.palette_.get(palette, ++pal);
        gl.uniform4f(this.glLocUColor_, c.nr, c.ng, c.nb, 1.0);
        gl.stencilFunc(gl.EQUAL, j, 0xFF);
        gl.drawArrays(stroke.primitive, 0, stroke.verts.length / 3);
      }
    }
  }
  
  gl.disableVertexAttribArray(this.glLocAPos_);

  // Return true so this keeps animating
  return true;
};





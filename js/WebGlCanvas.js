goog.provide('gfd.WebGlCanvas');
goog.provide('gfd.WebGlCanvasListener');
goog.provide('gfd.WebGlCanvas.createWebGlCanvas');
goog.provide('gfd.WebGlCanvas.releaseWebGlCanvas');

goog.require('gfd.Constants');

goog.require('goog.dom');


/**
 * A listener to a webgl canvas.
 * @interface
 */
gfd.WebGlCanvasListener = function(){};

/**
 * Called when webgl context is lost.
 */
gfd.WebGlCanvasListener.prototype.lostContext = function() {};

/**
 * Called when webgl context is restored.
 */
gfd.WebGlCanvasListener.prototype.restoredContext = function() {};

/**
 * A reusable webgl canvas that can be pooled to minimize the number of webgl
 * contexts.
 * @param {Boolean} cacheable
 * @constructor
 */
gfd.WebGlCanvas = function(cacheable)
{
  /**
   * The WebGl context for all drawing commands.
   * @type {Object}
   * @private
   */
  this.gl_ = null;
  
  /**
   * The canvas element we need to draw to.
   * @type {Element}
   * @private
   */
  this.glCanvas_ = goog.dom.createDom('canvas');
  
  /**
   * The programs created by the current user of the context.
   * @type {Array<Object>}
   * @private
   */
  this.glPrograms_ = [];
  
  /**
   * The buffers created by the current user of the context.
   * @type {Array.<Object>}
   * @private
   */
  this.glBuffers_ = [];
  
  /**
   * Whether this has or has not lost its gl context.
   * @type {boolean}
   * @private
   */
  this.valid_ = true;
  
  /**
   * The textures created by the current user of the context.
   * @type {Array.<Object>}
   * @private
   */
  this.glTextures_ = [];

  /**
   * The arguments used to initialize the context
   * @type {Object}
   * @private
   */
  this.glArgs_ = {preserveDrawingBuffer: !!cacheable, 
                  premultipliedAlpha: true/*!cacheable*/,
                  stencil: true};
  
  /**
   * An object using this.
   * @type {WebGlCanvasListener}
   * @private
   */
  this.listener_ = null;
  
  try {
    //this.gl_ = WebGLDebugUtils.makeDebugContext(this.glCanvas_.getContext("experimental-webgl", this.glArgs_));
    this.gl_ = this.glCanvas_.getContext("experimental-webgl", this.glArgs_);
  } catch (e) 
  {}
  
  if (this.gl_)
  {
    goog.events.listen(this.glCanvas_, 'webglcontextlost', this.lostContext_, false, this);
    goog.events.listen(this.glCanvas_, 'webglcontextrestored', this.restoredContext_, false, this);
  }
};

/**
 * @param {goog.events.Event} e
 */
gfd.WebGlCanvas.prototype.lostContext_ = function(e)
{
  e.preventDefault();
  this.valid_ = false;
  
  if (this.listener_)
  {
    this.listener_.lostContext();
  }
};

/**
 * @param {goog.events.Event} e
 */
gfd.WebGlCanvas.prototype.restoredContext_ = function(e)
{
  this.valid_ = true;
  
  if (this.listener_)
  {
    this.listener_.restoredContext();
  }
};

/**
 * Sets teh listener that gets updated when context gets lost/restored.
 * @param {gfd.WebGlCanvasListener} l
 */
gfd.WebGlCanvas.prototype.setListener = function(l)
{
  this.listener_ = l;
};

/**
 * Whether the canvas can be cached (drawn to a 2d canvas or image). So another
 * element can use the GL context.
 * @returns {boolean}
 */
gfd.WebGlCanvas.prototype.isCacheable = function()
{
  return !!this.glArgs_.preserveDrawingBuffer;
};

/**
 * Returns the webgl context
 * @returns {Object}
 */
gfd.WebGlCanvas.prototype.getGl = function()
{
  return this.gl_;
};

/**
 * Returns the canvas element
 * @returns {Element}
 */
gfd.WebGlCanvas.prototype.getCanvas = function()
{
  return this.glCanvas_;
};

/**
 * Creates a webgl program and returns it. Keeps track of the program so it
 * can be deleted when released.
 * @returns {Object}
 */
gfd.WebGlCanvas.prototype.createProgram = function()
{
  var p;
  if (this.gl_) this.glPrograms_.push(p = this.gl_.createProgram());
  return p;
};

/**
 * Creates a webgl texture and returns it. Keeps track of the texture so it
 * can be deleted when released.
 * @returns {Object}
 */
gfd.WebGlCanvas.prototype.createTexture = function()
{
  var t;
  if (this.gl_) this.glTextures_.push(t = this.gl_.createTexture());
  return t;
};

/**
 * Creates a webgl buffer and returns it. Keeps track of the buffer so it
 * can be deleted when released.
 * @returns {Object}
 */
gfd.WebGlCanvas.prototype.createBuffer = function()
{
  var b;
  if (this.gl_) this.glBuffers_.push(b = this.gl_.createBuffer());
  return b;
};
  
/**
 * Whether a gl context was successfully created.
 * @return {boolean}
 */
gfd.WebGlCanvas.prototype.isValid = function()
{
  return this.gl_ != null && this.valid_;
};

/**
 * Releases any gl objects. And resets the gl state.
 */
gfd.WebGlCanvas.prototype.release = function()
{
  var i, gl = this.gl_;
  
  if (gl)
  {
    for (i = this.glPrograms_.length - 1; i >= 0; --i)
    {
      gl.deleteProgram(this.glPrograms_[i]);
    }
    
    this.glPrograms_.length = 0;
    
    for (i = this.glBuffers_.length - 1; i >= 0; --i)
    {
      gl.deleteBuffer(this.glBuffers_[i]);
    }
    
    this.glBuffers_.length = 0;
    
    for (i = this.glTextures_.length - 1; i >= 0; --i)
    {
      gl.deleteTexture(this.glTextures_[i]);
    }
    
    this.glTextures_.length = 0;
    
    gl.clearColor(0, 0, 0, 0);
    gl.clearStencil(0);
    gl.clearDepth(0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
  }
    
};

/**
 * The number of canvases currently allocated.
 * @type {number}
 */
gfd.WebGlCanvas.numCanvases = 0;

/**
 * A static pool so WebGlArtElements can render when necessary.
 * @type {Array.<gfd.WebGlCanvas>}
 * @private
 */
gfd.WebGlCanvas.pool_ = [];

/**
 * Whether this can create a webgl canvas without going over max canvases.
 * @returns {boolean}
 */
gfd.WebGlCanvas.canCreateWebGlCanvas = function()
{
  return gfd.WebGlCanvas.pool_.length || 
    gfd.WebGlCanvas.numCanvases < gfd.Constants.MAX_WEBGL_CANVASES;
};

/**
 * A static method to create a webglcanvas by pulling it from a pool.
 * @param {gfd.WebGlCanvasListener} listener
 * @param {boolean} cacheable
 * @returns {gfd.WebGlCanvas}
 */
gfd.WebGlCanvas.createWebGlCanvas = function(listener, cacheable)
{
  var canvas;

  for (var i = gfd.WebGlCanvas.pool_.length - 1; i >= 0; --i)
  {
    if (gfd.WebGlCanvas.pool_[i].isCacheable() == cacheable)
    {
      canvas = gfd.WebGlCanvas.pool_[i];
      gfd.WebGlCanvas.pool_.splice(i, 1);
      break;
    }
  }

  if (!canvas && gfd.WebGlCanvas.numCanvases < gfd.Constants.MAX_WEBGL_CANVASES)
  {
    gfd.WebGlCanvas.numCanvases++;
    canvas = new gfd.WebGlCanvas(cacheable);
  }
  
  if (canvas && canvas.isValid())
  {
    canvas.setListener(listener);
    return canvas;
  }
  
  return null;
};

/**
 * A static method to release a webglcanvas by putting it back in the pool
 * @param {gfd.WebGlCanvas} canvas
 */
gfd.WebGlCanvas.releaseWebGlCanvas = function(canvas)
{
  canvas.setListener(null);
  canvas.release();
  gfd.WebGlCanvas.pool_.push(canvas);
};


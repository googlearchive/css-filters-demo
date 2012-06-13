/**
 * @fileoverview Base class and subclasses for art elements that use the video
 * element for rendering.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.VideoArtElement');

goog.require('gfd.ArtElement');
goog.require('gfd.Serializer');
goog.require('gfd.Serializable');

goog.require('goog.events.EventHandler');


/**
 * An ArtElement that encapsulates a Video canvas.
 * @param {number=} opt_allFlags
 * @constructor
 * @extends {gfd.ArtElement}
 * @implements {gfd.Serializable}
 */
gfd.VideoArtElement = function(opt_allFlags)
{
  gfd.ArtElement.call(this, 'video', opt_allFlags);
  
  this.video_ = null;
  this.videoWidth_ = 0;
  this.videoHeight_ = 0;
  this.path_ = null;
  this.pathUpdated_ = false;
  this.handler_ = new goog.events.EventHandler(this);
  
};
goog.inherits(gfd.VideoArtElement, gfd.ArtElement);

/**
 * @const
 * @type {string}
 * @private
 */
gfd.VideoArtElement.serialId = 'videl';

// Register for serialization engine
gfd.Serializer.registerClassForId(gfd.VideoArtElement.serialId, 
    gfd.VideoArtElement);

/** @override */
gfd.VideoArtElement.prototype.init = function()
{
  if (gfd.ArtElement.prototype.init.call(this, document.createElement('div')))
  {
    return this;
  }
};


/** @inheritDoc */
gfd.VideoArtElement.prototype.serialize = function()
{
  var obj = gfd.ArtElement.prototype.serialize.call(this);
  
  obj['path'] = this.path_;
  
  return obj;
};

/** @inheritDoc */
gfd.VideoArtElement.prototype.deserialize = function(data)
{
  if (gfd.ArtElement.prototype.deserialize.call(this, data))
  {
    if (data['path'])
    {
      this.setSource(data['path']);
    }
    
    return this.init();
  }
};

/** @inheritDoc */
gfd.VideoArtElement.prototype.getSerializationId = function()
{
  return gfd.VideoArtElement.serialId;
};


/** @override */
gfd.VideoArtElement.prototype.unfreeze = function()
{
  if (this.video_) this.video_.play();
};

/** @override */
gfd.VideoArtElement.prototype.freeze = function()
{
  if (this.video_) this.video_.pause();
};


/** @override */
gfd.VideoArtElement.prototype.load = function()
{
  this.video_ = document.createElement('video');
  this.video_.autoplay = true;
  this.video_.loop = true;
  this.handler_.listen(this.video_, 'loadedmetadata', this.videoDimensionsReady_);
  this.getRenderEl().appendChild(this.video_);
};

/** @override */
gfd.VideoArtElement.prototype.disposeInternal = function()
{
  if (this.video_)
  {
    this.handler_.unlisten(video_, 'loadedmetadata', this.videoDimensionsReady_);
    this.video_.src = '';
    this.video_ = null;
  }
};

/**
 * Sets the video source path.
 * @param {string} path
 * @param {number=} opt_width
 * @param {number=} opt_height
 */
gfd.VideoArtElement.prototype.setSource = function(path, opt_width, opt_height)
{
  if (path && path !== this.path_)
  {
    this.path_ = path;
    this.videoWidth_ = opt_width | 0;
    this.videoHeight_ = opt_height | 0;
    this.pathUpdated_ = true;
    this.requestRender();
  }
};

/**
 * Handler of onmetadata of video object.
 * @private
 */
gfd.VideoArtElement.prototype.videoDimensionsReady_ = function()
{
  this.scaleVideo_();
};

/** @override */
gfd.VideoArtElement.prototype.updateRectImpl = function(oldRect, newRect)
{
  this.scaleVideo_();
};

/**
 * @override
 * Hack Chrome 20 crashes when video element is removed from stage.
 */
gfd.VideoArtElement.prototype.removed = function()
{
  if (this.video_) this.video_.src = '';
  
  gfd.ArtElement.prototype.removed.call(this);
};

/**
 * @override
 * Hack Chrome 20 crashes when video element is removed from stage.
 */
gfd.VideoArtElement.prototype.added = function(artBoard, index, frozen)
{
  this.pathUpdated_ = true;
  gfd.ArtElement.prototype.added.call(this, artBoard, index, frozen);
};

/**
 * Updates the video so it fills the container properly.
 * @private
 */
gfd.VideoArtElement.prototype.scaleVideo_ = function()
{
  if (this.video_ && this.video_.src && this.video_.src.length)
  {
    var container = this.getRenderEl();
    var rect = this.getRect();
    var width = Math.round(rect.width);
    var height = Math.round(rect.height);
    var videoWidth = ((this.video_.videoWidth || this.videoWidth_) || 640);
    var videoHeight = ((this.video_.videoHeight || this.videoHeight_) || 360);
    // Force the video to fill the rect by cropping
    var scale = ((videoWidth / width) > (videoHeight / height)) ? 
        (height / videoHeight) :
        (width / videoWidth);
        
    container.style.width = width + 'px';
    container.style.height = height + 'px';
    container.style.overflow = 'hidden';
    
    this.video_.width = Math.round(videoWidth * scale);
    this.video_.height = Math.round(videoHeight * scale);
    
    // Keep it centered
    this.video_.style.marginLeft = Math.round((width - this.video_.width) * 0.5) + 'px';
    this.video_.style.marginTop = Math.round((height - this.video_.height) * 0.5) + 'px';
  }
};

/** @override */
gfd.VideoArtElement.prototype.updateImpl = function(elapsedTimeInSeconds, flags)
{
  if (this.pathUpdated_)
  {
    this.video_.src = this.path_;
    this.pathUpdated_ = false;
    this.scaleVideo_();
  }
  
  
  flags &= gfd.ArtElement.UpdateFlags.CLEAR_RENDER; // Clear render flag
  return flags;
};
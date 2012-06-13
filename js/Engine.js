/**
 * @fileoverview Deals with timing functions. Uses requestAnimFrame to send
 * update messages out to the artboard. Also maintains a frame rate and 
 * dispatches warnings if frame rate gets too low.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Engine');

goog.require('gfd.ArtBoard');
goog.require('gfd.Constants');
goog.require('goog.Timer');
goog.require('goog.events.EventTarget');

/**
 * An engine for running the timesteps/updates of the arboard.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
gfd.Engine = function()
{
  /**
   * @type {Function}
   * @private
   */
  this.tickClosure_ = goog.bind(this.tick, this);
  
  /**
   * @type {Function}
   * @private
   */
  this.resizeClosure_ = goog.bind(this.resize, this);
  
  /**
   * @type {Boolean}
   * @private
   */
  this.paused_ = true;

  /**
   * @type {gfd.ArtBoard}
   * @private
   */
  this.artBoard_ = null;
  
  /**
   * @type {Boolean}
   * @private
   */
  this.artBoardNeedsResize_ = false;
  
  /**
   * @type {Number}
   * @private
   */
  this.lastTime_ = 0;
  
  /**
   * @type {Number}
   * @private
   */
  this.time_ = 0;
  
  /**
   * Number of times frame rate has been below threshold.
   * @type {number}
   * @private
   */
  this.badFrameRateCount_ = 0;
  
  /**
   * The amount of time to process the last frame.
   * @type {number}
   * @private
   */
  this.frameTime_ = 1000 / gfd.Constants.GOAL_FRAME_RATE;
  
  /**
   * Low Threshold for judging if the framerate is bad.
   * @type {number}
   * @private
   */
  this.badFrameRate_ = 1000 / gfd.Constants.BAD_FRAME_RATE;
  
  /**
   * Timer to check frame rate every x seconds.
   * @type {goog.Timer}
   * @private
   */
  this.frameRateMonitor_ = new goog.Timer(1000 * 
      gfd.Constants.FRAME_RATE_CHECK_INTERVAL_S);
  
  goog.events.listen(this.frameRateMonitor_, 'tick', this.monitorFrameRate_, 
      false, this);
};
goog.inherits(gfd.Engine, goog.events.EventTarget);

/**
 * Called every frame to update artboard if necessary.
 */
gfd.Engine.prototype.tick = function(timeNow)
{
  if (!this.paused_)
  {
    window['requestAnimFrame'](this.tickClosure_);
    
    //var timeNow = goog.now();
  
    if (this.lastTime_ && (timeNow - this.lastTime_ < 2000)) 
    {
      // Calculate frame rate
      this.frameTime_ = this.frameTime_ * 0.9 + (timeNow - this.lastTime_) * 0.1;
      this.time_ += (timeNow - this.lastTime_) / 1000;
    }
    this.lastTime_ = timeNow;
    
    if (this.artBoard_)
    {
      this.artBoard_.update(this.time_);
    }
  }
};

/**
 * Called every x seconds to check if the framerate is ok. Dispatches warnings
 * if it has been below threshold for a certain number of checks.
 * @param {goog.events.Event} e
 * @private
 */
gfd.Engine.prototype.monitorFrameRate_ = function(e)
{
  if (this.frameTime_ > this.badFrameRate_)
  {
    if (this.badFrameRateCount_++ >= gfd.Constants.BAD_FRAME_RATE_HYST)
    {
      this.dispatchEvent('badFrameRate');
      this.badFrameRateCount_ = 0;
      this.frameTime_ = 1000 / gfd.Constants.GOAL_FRAME_RATE;
    }
  }
  else 
  {
    this.badFrameRateCount_ = 0;
  }
};

/**
 * Stops the engine.
 */
gfd.Engine.prototype.stop = function()
{
  this.paused_ = true;
  this.lastTime_ = 0;
  this.frameRateMonitor_.stop();
};

/**
 * Starts the engine if not going already.
 */
gfd.Engine.prototype.start = function()
{
  if (this.paused_)
  {
    this.paused_ = false;
    this.lastTime_ = 0;
    this.tick();
    this.frameRateMonitor_.start();
  }
};

/**
 * Called when the artboard needs to be resized.
 * @param e
 */
gfd.Engine.prototype.resize = function(e)
{
  if (this.artBoard_)
  {
    this.artBoard_.resize(window.innerWidth, window.innerHeight);
  }
};

/**
 * Sets the artboard.
 * @param {gfd.ArtBoard} artBoard
 */
gfd.Engine.prototype.setArtBoard = function(artBoard)
{
  if (this.artBoard_)
  {
    if (this.artBoardNeedsResize_)
    {
      window.removeEventListener('resize', this.resizeClosure_);
      this.artBoardNeedsResize_ = false;
    }
    
    this.artBoard_ = null;
  }
  
  this.artBoard_ = artBoard;
  
  if (this.artBoard_)
  {
    this.lastTime_ = 0;
    this.time_ = 0;
    
    if (this.artBoard_.isFullBrowser())
    {
      this.artBoardNeedsResize_ = true;
      window.addEventListener('resize', this.resizeClosure_);
      this.resize(null);
    }
    
    this.start();
  }
};
/**
 * @fileoverview An ArtBoard defines the area that holds all of the ArtElements.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.ArtBoard');

goog.require('gfd.ArtElement');
goog.require('gfd.Palette');

/**
 * The ArtBoard is the canvas. ArtElements are added to it. 
 * @param {number=} opt_width The width of the ArtBoard, if not provided it is
 *               assumed to be full browser.
 * @param {number=} opt_height The height of the ArtBoard. If not provided it is
 *               assumed to be full browser.
 * @constructor
 */
gfd.ArtBoard = function(opt_width, opt_height)
{
  /**
   * @type {Element}
   * @private
   */
  this.artBoardEl_ = document.getElementById('gfd-artboard');
  
  /**
   * @type {number}
   * @private
   */
  this.width_ = opt_width;
  
  /**
   * @type {number}
   * @private
   */
  this.height_ = opt_height;

  /**
   * @type {boolean}
   * @private
   */
  this.full_ = false;
  
  /**
   * @type {?gfd.ArtElement}
   * @private
   */
  this.updateList_ = null;
  
  /**
   * @type {boolean}
   * @private
   */
  this.frozen_ = false;
  
  /**
   * The number of items in the drawData array that need to be drawn.
   * @type {number}
   * @private
   */
  this.needsDraw_ = 0;
  
  /**
   * Data to be drawn to the draw area
   * @type {Array.<number>}
   * @private
   */
  this.drawData_ = [];
  
  /**
   * A map.
   * @type {Object.<string,gfd.ArtElement}
   * @private
   */
  this.elements_ = {};
  
  /**
   * @type {gfd.Selection}
   * @private
   */
  this.selection_ = null;
  
  /**
   * @type {Array.<gfd.ArtElement>}
   * @private
   */
  this.sortedElements_ = [];
  
  /**
   * @type {HTMLCanvasElement}
   * @private
   */
  this.drawDisplay_ = document.createElement('canvas');
  
  /**
   * @type {HTMLCanvasContext}
   * @private
   */
  this.drawDisplayCtx_ = this.drawDisplay_.getContext('2d');
  
  /**
   * @type {string}
   * @private
   */
  this.paletteName_ = '';
  
  /**
   * An index to keep track of when an object was added.
   * @type {number}
   * @private
   */
  this.index_ = 0;
  
  /**
   * A flag that indicates we should sort internal array of elements to match
   * actual z-indexes.
   * @type {boolean}
   * @private
   */
  this.needsSort_ = false;

  
  // Initialize
  this.drawDisplay_.className = 'gfd-draw-canvas';
  this.artBoardEl_.appendChild(this.drawDisplay_);
  
  // Just use css values as width height
  var size = goog.style.getSize(this.artBoardEl_);
  this.resize(size.width, size.height);
};

/**
 * Returns the palette name used by this art board.
 * @returns {string}
 */
gfd.ArtBoard.prototype.getPaletteName = function()
{
  return this.paletteName_;
};

/**
 * Sets the palette name and notifies all art elements on it.
 * @param {string} p the new palette name
 */
gfd.ArtBoard.prototype.setPaletteName = function(p)
{
  if (p != this.paletteName_)
  {
    this.paletteName_ = p;
    
    // Dispatch change to all children
    for (var i = this.sortedElements_.length - 1; i >= 0; --i)
    {
      this.sortedElements_[i].setPaletteName(p);
    }
  }
};

/**
 * Freezes all art elements, stopping any internal animations not controlled
 * by the update loop.
 * @param {boolean} f whether to freeze or unfreeze.
 */
gfd.ArtBoard.prototype.freeze = function(f)
{
  if (this.frozen_ != f)
  {
    this.frozen_ = !!f;
    
    for (var i = this.sortedElements_.length - 1; i >= 0; --i)
    {
      if (f) this.sortedElements_[i].freeze();
      else this.sortedElements_[i].unfreeze();
    }
  }
};

/**
 * The width of the artboard
 * @returns {number}
 */
gfd.ArtBoard.prototype.getWidth = function()
{
  return this.width_;
};

/**
 * The height of the artboard
 * @returns {number}
 */
gfd.ArtBoard.prototype.getHeight = function()
{
  return this.height_; 
};

/**
 * Utility function to check whether a point in artboard coordinates is 
 * is contained.
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
gfd.ArtBoard.prototype.contains = function(x, y)
{
  return x >= 0 && y >= 0 && x < this.width_ && y < this.height_;
};

/**
 * Called from a controller to start drawing from mouse motion.
 */
gfd.ArtBoard.prototype.beginDrawing = function()
{
  this.drawDisplay_.style.display = 'block';
  document.body.style['-webkit-user-select'] = 'none'; // Prevent selecting text
};

/**
 * Called from a controler to draw a line from mouse motion. Points are pushed
 * onto a buffer and drawn in the update loop.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
gfd.ArtBoard.prototype.drawStroke = function(x1, y1, x2, y2)
{
  this.drawData_[this.needsDraw_++] = x1;
  this.drawData_[this.needsDraw_++] = y1;
  this.drawData_[this.needsDraw_++] = x2;
  this.drawData_[this.needsDraw_++] = y2;
};

/**
 * Called from a controller to end drawing, clears canvas.
 */
gfd.ArtBoard.prototype.endDrawing = function()
{
  this.drawDisplayCtx_.clearRect(0, 0, this.drawDisplay_.width, 
      this.drawDisplay_.height);
  this.drawDisplay_.style.display = 'none';
  document.body.style['-webkit-user-select'] = '';
  document.body.style['cursor'] = 'default';
  this.needsDrawing_ = 0;
};

/**
 * Returns the art element nearest the top that contains that point.
 * @param {number} x coordinate in absolute coordinates of art board
 * @param {number} y coordinate in absolute coordinates of art board.
 * @returns {?gfd.ArtElement}
 */
gfd.ArtBoard.prototype.getElementUnderPoint = function(x, y, opt_start)
{
  if (opt_start && 
      opt_start.getRect().contains(x,y) && 
      opt_start.hit(x,y))
  {
    return opt_start;
  }
  
  for (var i = this.sortedElements_.length - 1; i >= 0; --i)
  {
    var el = this.sortedElements_[i];
    
    if (el !== opt_start && el.getRect().contains(x, y))
    {
      if (el.hit(x, y))
      {
        return el;
      }
    }
  }
};

/**
 * Gets a selection if an artelement grants one.
 * @param {number} x coordinate in absolute coordinates of artboard.
 * @param {number} y coordinate in absolute coordinates of artboard.
 * @returns {gfd.Selection|null}
 */
gfd.ArtBoard.prototype.getSelectionUnderPoint = function(x, y)
{
  var selection = this.selection_ || (this.selection_ = new gfd.Selection());

  // Don't go to the bottom element which is the background
  for (var i = this.sortedElements_.length - 1; i >= 0; --i)
  {
    var el = this.sortedElements_[i];
    
    if (el.getRect().contains(x, y))
    {
      if (el.hit(x, y, this.selection_))
      {
        // Found a selection
        selection.artEl = el;
        //this.sortedElements_[i].select(selection);
        this.selection_ = null; // Can't use this any more
        break;
      }
    }
  }
  
  return selection.artEl ? selection : null;
};

/**
 * Returns the list of sorted elements.
 * @returns {Array.<gfd.ArtElement>}
 */
gfd.ArtBoard.prototype.getElementsSorted = function()
{
  if (this.needsSort_)
  {
    this.sortedElements_.sort(gfd.ArtElement.sortByDepthAndIndex);
    this.needsSort_ = false;
  }
  
  
  return this.sortedElements_.concat();
};

/**
 * Returns the number of elements on the artboard.
 * @returns {number}
 */
gfd.ArtBoard.prototype.getNumElements = function()
{
  return this.sortedElements_.length;
};

/**
 * Returns the main dom element container used by the artboard.
 * @returns {Element}
 */
gfd.ArtBoard.prototype.getDomEl = function()
{
  return this.artBoardEl_;
};

/**
 * Returns whether this element should scale to fill the browser.
 * @returns {boolean}
 */
gfd.ArtBoard.prototype.isFullBrowser = function()
{
  return this.full_;
};

gfd.ArtBoard.prototype._add = function(artEl)
{
  // Find next sibling
  if (this.needsSort_)
  {
    this.sortedElements_.sort(gfd.ArtElement.sortByDepthAndIndex);
    this.needsSort_ = false;
  }
  
  var index = this.sortedElements_.indexOf(artEl) + 1;

  if (index >= 0 && index < this.sortedElements_.length)
  {
    for (; index < this.sortedElements_.length; index++)
    {
      if (this.sortedElements_[index].getDomEl().parentNode == this.artBoardEl_)
      {
        this.artBoardEl_.insertBefore(artEl.getDomEl(), this.sortedElements_[index].getDomEl());
        return;
      }
    }
  }
  
  this.artBoardEl_.appendChild(artEl.getDomEl());
};

/**
 * Adds an art element to the artboard.
 * @param {gfd.ArtElement} artEl
 */
gfd.ArtBoard.prototype.addArtElement = function(artEl)
{
  if (!this.elements_[artEl.hash()])
  {
    this.elements_[artEl.hash()] = artEl;
    artEl.retain();
    artEl.setPaletteName(this.paletteName_);
    artEl.added(this, this.index_++, this.frozen_);
    
    // Add to the sorted elements
    var index = -1;
    for (var i = 0; i < this.sortedElements_.length; i++)
    {
      if (artEl.compareOrder(this.sortedElements_[i]) < 0)
      {
        index = i;
        break;
      }
    }
    
    if (index >= 0)
    {
      this.sortedElements_.splice(index, 0, artEl);
    }
    else
    {
      this.sortedElements_.push(artEl);
    }
  }
};

/**
 * Remove all elements and release them.
 */
gfd.ArtBoard.prototype.clear = function()
{
  for (var elementId in this.elements_)
  {
    var element = this.elements_[elementId];
    element.removed();
    element.release();
  };
  
  this.elements_ = {};
  this.sortedElements_ = [];
  this.updateList_ = null;
  this.needsSort_ = false;
};

/**
 * Called from art elements when their depth changes.
 */
gfd.ArtBoard.prototype.artElementDepthChanged = function()
{
  this.needsSort_ = true;
};

/**
 * Currently just returns the top most item
 * @returns {gfd.ArtElement|undefined}
 */
gfd.ArtBoard.prototype.getElementWithFocus = function()
{
  if (this.sortedElements_.length)
  {
    return this.sortedElements_[this.sortedElements_.length - 1];
  }
};

/**
 * Removes an art element from the artboard.
 * @param {gfd.ArtElement} artEl
 */
gfd.ArtBoard.prototype.removeArtElement = function(artEl)
{
  var temp;
  if (this.elements_[artEl.hash()])
  {
    delete this.elements_[artEl.hash()];
    this.sortedElements_.splice(this.sortedElements_.indexOf(artEl), 1);
    
    // Push a final update
    if (artEl.updateFlags)
    {
      artEl.update(0, artEl.updateFlags);
      artEl.updateFlags = 0;
    }
    
    // Freeze it
    artEl.freeze();
    
    // Remove from update list
    if (temp = this.updateList_)
    {
      if (artEl === temp)
      {
        this.updateList_ = this.updateList_.updateNext;
      }
      else
      {
        while (temp.updateNext)
        {
          if (temp.updateNext === artEl)
          {
            temp.updateNext = temp.updateNext.updateNext;
            break;
          }
          
          temp = temp.updateNext;
        }
      }
    }
    
    artEl.removed();
    artEl.release();
  }
};

  
/**
 * Called by art elements when they want to be added to the update list.
 * @param {gfd.ArtElement} artEl
 * @param {boolean} flags
 */
gfd.ArtBoard.prototype.requestUpdate = function(artEl, flags)
{
  if (!flags) return;
  
  if (!artEl.updateFlags)
  {
    artEl.updateNext = this.updateList_;
    this.updateList_ = artEl;
  }
  
  artEl.updateFlags |= flags;
};
  
/**
 * Called from an engine every frame to update items for rendering.
 * @param {number} time
 */
gfd.ArtBoard.prototype.update = function(time)
{
  if (this.needsDraw_)
  {
    for (var d = 0; d < this.needsDraw_; )
    {
      var x1 = this.drawData_[d++], y1 = this.drawData_[d++], 
          x2 = this.drawData_[d++], y2 = this.drawData_[d++],
          dx = x2 - x1, dy = y2 - y1,
          dist = Math.sqrt(dx * dx + dy * dy);

      dx *= (-1/dist);
      dy *= (2/dist);
      
      // Draw a parallel
      // TODO: is using shadowOffset or drawing second path faster?
      //this.drawDisplayCtx_.shadowOffsetX = dy;
      //this.drawDisplayCtx_.shadowOffsetY = dx;
      
      this.drawDisplayCtx_.strokeStyle = '#E6E6E6';
      this.drawDisplayCtx_.beginPath();
      this.drawDisplayCtx_.moveTo(x1 + dy, y1 + dx);
      this.drawDisplayCtx_.lineTo(x2 + dy, y2 + dx);
      this.drawDisplayCtx_.stroke();
      
      this.drawDisplayCtx_.strokeStyle = '#0A0A0A';
      this.drawDisplayCtx_.beginPath();
      this.drawDisplayCtx_.moveTo(x1, y1);
      this.drawDisplayCtx_.lineTo(x2, y2);
      this.drawDisplayCtx_.stroke();
    }
    
    this.needsDraw_ = 0;
  }
  
  if (this.needsSort_)
  {
    this.sortedElements_.sort(gfd.ArtElement.sortByDepthAndIndex);
    this.needsSort_ = false;
  }
  
  if (!this.frozen_)
  {
    var temp, flags, redo, redoEnd, list = this.updateList_;
    
    var updateBlock = 0x40000000;
    var updateClear = 0x3FFFFFFF;
    
    this.updateList_ = null; // Clear the update list so if anything new comes
    
    if (list)
    {
      do
      {
        temp = list.updateNext;
        flags = list.updateFlags;
        list.updateFlags = updateBlock; // Don't allow a re-add while iterating
        flags = list.update(time, flags);
        if (list.updateFlags = ((list.updateFlags & updateClear) | flags))
        {
          if (!redo) { redo = redoEnd = list; } // Start redo list
          else { redoEnd.updateNext = list; redoEnd = list; } // Add to redo list
        }
        list = temp; // Iterate
      }
      while (list);
    
      // Merge new items with redo items
      if (redoEnd) { redoEnd.updateNext = this.updateList_; this.updateList_ = redo; }
    } 
  }
};

/**
 * Sets a theme for the artboard and page as a whole.
 * @param {string} theme
 */
gfd.ArtBoard.prototype.setTheme = function(theme)
{
  if (theme)
  {
    switch (theme)
    {
      case 'light':
        this.artBoardEl_.style.background = '#F7F6F3';
        break;
        
      case 'dark':
        this.artBoardEl_.style.background = '#0c0c0c';
        break;
    }
  }
};

/**
 * Called from window to resize if full browser.
 * @param {number} width
 * @param {number} height
 */
gfd.ArtBoard.prototype.resize = function(width, height)
{
  this.width_ = width;
  this.height_ = height;
  //this.artBoardEl_.style.width = width + 'px';
  //this.artBoardEl_.style.height = height + 'px';
  this.drawDisplay_.width = width;
  this.drawDisplay_.height = height;
  this.drawDisplayCtx_.strokeStyle = 'rgb(10,10,10)';
  this.drawDisplayCtx_.lineWidth = 2;
  this.drawDisplayCtx_.lineCap = 'round';
  /*
  this.drawDisplayCtx_.shadowColor = 'rgb(230,230,230)';
  this.drawDisplayCtx_.shadowOffsetX = 1;
  this.drawDisplayCtx_.shadowOffsetY = 1;
  */
};
  
/**
 * @fileoverview Main logic for the Google Filter Demo project.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Controller');

goog.require('gfd.ArtBoard');
goog.require('gfd.ArtistPalettes');
goog.require('gfd.ArtElement');
goog.require('gfd.Background');
goog.require('gfd.CanvasRainbowSurferElement');
goog.require('gfd.Constants');
goog.require('gfd.EffectsDelegate');
goog.require('gfd.EffectsPanel');
goog.require('gfd.Engine');
goog.require('gfd.ImageArtElement');
goog.require('gfd.InfoPanels');
goog.require('gfd.OptionsPanels');
goog.require('gfd.Rectangle');
goog.require('gfd.Selection');
goog.require('gfd.SvgGestureShapeElement');
goog.require('gfd.Toolbar');
goog.require('gfd.VideoArtElement');
goog.require('gfd.WebGlArtElement');

goog.require('goog.events.EventHandler');
goog.require('goog.math.Box');
goog.require('goog.style');
goog.require('goog.ui.Dialog');
goog.require('goog.net.XhrIo');

/**
 * The logic and glue code.
 * @constructor
 * @implements {gfd.ArtElement.FactoryDelegate}
 */
gfd.Controller = function()
{
  /**
   * The tool modes available for the application. These affect what happens 
   * when the mouse begins moving on the canvas.
   * @type {gfd.Controller.ToolModes}
   * @private
   */
  this.toolMode_ = gfd.Controller.ToolModes.NONE;

  /**
   * An simple engine that forces most processing to occur in the same render
   * loop.
   * @type {gfd.Engine}
   * @private
   */
  this.engine_ = new gfd.Engine(); 
  
  /**
   * The artboard is the 'scene' for the canvas. It holds and organizes all of
   * the objects.
   * @type {gfd.ArtBoard}
   * @private
   */
  this.artBoard_ = new gfd.ArtBoard();
  
  /**
   * The artboard coord is just a utility object to keep the dimensions of the
   * position of the artboard so we can pass it coordinates relative to this.
   * @type {goog.math.Coordinate?}
   * @private
   */
  this.artBoardPos_ = null;
  
  /**
   * The UI element used for selecting the ToolMode.
   * @type {gfd.Toolbar}
   * @private
   */
  this.toolbar_ = new gfd.Toolbar();
  
  /**
   * The UI element used for selecting palettes and backgrounds.
   * @type {gfd.OptionsPanels}
   * @private
   */
  this.optionsPanels_ = new gfd.OptionsPanels();
  
  /**
   * The UI element used for selecting and dragging effects.
   * @type {gfd.EffectsPanel}
   * @private
   */
  this.effectsPanel_ = new gfd.EffectsPanel();
  
  /**
   * The UI element used for displaying info the user.
   * @type {gfd.InfoPanels}
   * @private
   */
  this.infoPanels_ = new gfd.InfoPanels();
  
  /**
   * The current selection, if any. If there is a selection it is guaranteed
   * to have at least an art element selected.
   * @type {gfd.Selection?}
   * @private
   */
  this.selection_ = null;

  /**
   * An external object used for gesture recognition.
   * @type {Object}
   * @private
   */
  this.recognizer_ = null;//new DollarRecognizer.Recognizer();
  
  
  /**
   * A flag if the mouse is currently drawing.
   * @type {boolean}
   * @private
   */
  this.drawing_ = false;
  
  
  /**
   * A flag if the mouse is currently dragging an object.
   * @type {boolean}
   * @private
   */
  this.dragging_ = false;
  
  
  /**
   * A point array used for drawing.
   * @type {Array.<gfd.Point>}
   * @private
   */
  this.drawPoints_ = [new gfd.Point()];
  
  
  /**
   * A number to keep track of the number of points in the current drawing.
   * Since we reuse the array, it may differ from drawPoints.length
   * @type {number}
   * @private
   */
  this.numDrawPoints_ = 0;
  
  /**
   * The bounds of the current drawing. Used to create a rectangle to pass to
   * objects when they are created.
   * @type {goog.math.Box}
   * @private
   */
  this.drawBounds_ = new goog.math.Box();
  
  /**
   * @type {gfd.Point}
   * @private
   */
  this.hoverPoint_ = new gfd.Point();
  
  /**
   * @type {Element}
   * @private
   */
  this.hoverElement_ = null;
  
  /**
   * @type {gfd.Point}
   * @private
   */
  this.lastHoverPoint_ = new gfd.Point();
  
  /**
   * @type {number}
   * @private
   */
  this.hoverCount_ = 0;
  
  /**
   * @type {goog.Timer}
   * @private
   */
  this.hoverTimer_ = new goog.Timer(400);
  
  
  
  /**
   * Holds the last point drawn for drawing calculations.
   * @type {gfd.Point}
   * @private
   */
  this.lastDrawPoint_ = null;
  
  
  /**
   * Whether the controller has been initialized.
   * @type {boolean}
   * @private
   */
  this.started_ = false;
  
  /**
   * A dialog box to confirm actions like deleting.
   * @type {goog.ui.Dialog}
   * @private
   */
  this.confirmDialog_ = new goog.ui.Dialog();
  
  
  /**
   * A flag to indicate what the confirm dialog is being used for since it
   * could be reused.
   * @type {string}
   * @private
   */
  this.confirmDialogAction_ = '';
  
  /**
   * Keeps track of if we warned user that because of frame rate items will
   * be removed.
   * @type {number}
   * @private
   */
  this.frameRateWarnCount_ = 0;
  
  
  /**
   * Just a cached node for the artboard element.
   * @type {Element}
   * @private
   */
  this.artBoardEl_ = this.artBoard_.getDomEl();
  
  /**
   * An object to take most of the effects and filter application logic.
   * @type {gfd.EffectsDelegate}
   * @private
   */
  this.effectsDelegate_ = new gfd.EffectsDelegate();

  
  /**
   * The background, note this kind of needs to be hooked up to arboard.resize
   * if we want full browser window.
   * @type {gfd.Background}
   * @private
   */
  this.background_ = new gfd.Background(this.artBoard_, this.effectsDelegate_);
  this.background_.resize(this.artBoard_.getWidth(), this.artBoard_.getHeight());
  
  
  /**
   * Whether the onload event has been called.
   * @type {boolean}
   * @private
   */
  this.loaded_ = false;
  
  /**
   * Event handler used for everything.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.handler_ = new goog.events.EventHandler(this);
};

/**
 * @enum {string}
 */
gfd.Controller.ToolModes = {
   NONE: 'none',
   CUTOUT_PAINTER: 'cutout-painter',
   VIDEO_MASKER: 'video-masker',
   LINE_SPLATTER: 'line-splatter',
   RAINBOW_SURFER: 'rainbow-surfer',
   GESTURE_SHAPER: 'gesture-shaper',
   DELETE: 'delete',
   RANDOMIZE: 'randomize',
   EYEDROPPER: 'eyedropper',
   TRANSFORM: 'transform'
};



/**
 * Callback for when the confirm dialog is clicked for deleting objects for 
 * instance.
 * @param e
 * @private
 */
gfd.Controller.prototype.dialogSelectHandler_ = function(e)
{
  var selectedEl = this.selection_ ? this.selection_.artEl : null;
  
  switch (this.confirmDialogAction_)
  {
    case 'delete':
      if (selectedEl)
      {
        this.deselect();
        if (e.key == 'yes') this.artBoard_.removeArtElement(selectedEl);
      }
      break;
  };
  
  this.enterModal_(false);
};


/**
 * Causes the effect info to be displayed to the user for the given art
 * element.
 * @param {gfd.ArtElement} artEl the art element
 */
gfd.Controller.prototype.showEffectInfoForElement = function(artEl)
{
  var effect = this.effectsDelegate_.getEffectByArtElement(artEl);
 
  if (effect)
  {
    var info = this.effectsPanel_.getEffectInfoForId(effect.getId());
    this.infoPanels_.showEffectInfo(info, artEl);
  }
};


/**
 * Called every time an effect is applied to an art element (dispatched from
 * Effects Delegate.
 * @param {gfd.EffectDelegateEvent} e the event
 * @private
 */
gfd.Controller.prototype.effectAppliedHandler_ = function(e)
{
  this.showEffectInfoForElement(e.artEl);
};

/** @inheritDoc */
gfd.Controller.prototype.removeLruOfClass = function(artElClass, opt_filterFunc)
{
  var i, elements = this.artBoard_.getElementsSorted().concat();
 
  if (elements.length)
  {
    for (i = elements.length - 1; i > 0; --i)
    {
      if (!(elements[i] instanceof artElClass))
      {
        elements.splice(i, 1);
      }
    }
    
    elements.shift(); // Remove background
    
    elements.sort(gfd.ArtElement.sortByLruAndDepthAndIndex);
    
    if (opt_filterFunc)
    {
      elements = elements.filter(opt_filterFunc);
    }
    
    if (elements.length)
    {
      this.artBoard_.removeArtElement(elements.pop());
      return true;
    }
  }
  
  return false;
};

/**
 * Enter or exit modal mode which. Just freezes the artboard.
 * @param {boolean} modal
 * @private
 */
gfd.Controller.prototype.enterModal_ = function(modal)
{
  //Restart the engine so items can begin rendering again
  this.artBoard_.freeze(modal);
  // Unfreeze any animated effects
  if (modal) this.effectsDelegate_.freeze();
  else this.effectsDelegate_.unfreeze();
};


/**
 * Called when an effect is dropped onto the artboard.
 * @param {gfd.EffectsPanelDragEvent} e
 * @private
 */
gfd.Controller.prototype.effectDroppedHandler_ = function(e)
{
  var offset = goog.style.getClientPosition(this.artBoardEl_);
  
  var offsetX = e.clientX - offset.x;
  var offsetY = e.clientY - offset.y;
  
  if (offsetX > 0 && offsetX < this.artBoard_.getWidth() &&
      offsetY > 0 && offsetY < this.artBoard_.getHeight())
  {
    var artEl = this.artBoard_.getElementUnderPoint(offsetX, offsetY);
    
    if (artEl && !(artEl instanceof gfd.ImageArtElement)) // ImageArtElement has some bugs with filters
    {
      this.effectsDelegate_.applyEffectToArtElement(artEl, e.effect);
    }
  }
};


/**
 * Called when an effect is requested to be added, from the effects panel.
 * @param {goog.events.Event} e
 * @private
 */
gfd.Controller.prototype.effectAddedHandler_ = function(e)
{
  this.effectsPanel_.addEffect(
      this.effectsDelegate_.createFilterEffect());
};


/**
 * Called when the tool changes from the toolbar UI.
 * @private
 */
gfd.Controller.prototype.toolbarBrushHandler_ = function()
{
  this.toolMode_ = this.toolbar_.getSelectedBrush();
};


/**
 * Called when the background changes from the options panels.
 * @private
 */
gfd.Controller.prototype.backgroundChangeHandler_ = function(e)
{
  this.background_.setMode(
      this.optionsPanels_.getSelectedBackgroundId());
};


/**
 * Handler
 * @param {goog.events.Event} e
 */
gfd.Controller.prototype.paletteChangeHandler_ = function(e)
{
  var palette = this.optionsPanels_.getSelectedPaletteId();
  this.artBoard_.setPaletteName(palette);
};

/**
 * Handler
 * @param {goog.events.Event} e
 */
gfd.Controller.prototype.saveClickHandler_ = function(e)
{
  this.save();
};



/**
 * Sets up controller vars.
 */
gfd.Controller.prototype.start = function()
{
  if (!this.started_)
  {
    this.started_ = true;
    
    // Initialize listeners
    this.handler_.listen(this.toolbar_, 'click', 
        this.toolbarBrushHandler_);
    this.handler_.listen(this.optionsPanels_, 'background', 
        this.backgroundChangeHandler_);
    this.handler_.listen(this.optionsPanels_, 'palette', 
        this.paletteChangeHandler_);
    this.handler_.listen(this.effectsPanel_, 'effect', 
        this.effectDroppedHandler_);
    this.handler_.listen(this.effectsPanel_, 'add', 
        this.effectAddedHandler_);
    this.handler_.listen(this.effectsDelegate_, 'applied', 
        this.effectAppliedHandler_);
    
    this.handler_.listen(this.engine_, 'badFrameRate',
        this.frameRateWarningHandler_);
    
    this.handler_.listen(this.hoverTimer_, 'tick',
        this.hoverTimerHandler_);

    var el;
    if (el = document.getElementById('gfd-save'))
    {
      this.handler_.listen(el, 'click', this.saveClickHandler_);
    }
    
    
    this.handler_.listen(this.confirmDialog_, goog.ui.Dialog.EventType.SELECT, 
        this.dialogSelectHandler_);

    this.handler_.listen(this.artBoardEl_, [goog.events.EventType.TOUCHSTART, 
                                          goog.events.EventType.MOUSEDOWN],
                                          this.mouseDownHandler_);
    
    this.handler_.listen(document, [goog.events.EventType.TOUCHMOVE, 
                                            goog.events.EventType.MOUSEMOVE],
                                            this.mouseMoveHandler_);
    
    this.handler_.listen(document, [goog.events.EventType.TOUCHEND, 
                                            goog.events.EventType.MOUSEUP],
                                            this.mouseUpHandler_);

    
    this.engine_.setArtBoard(this.artBoard_); // Add artboard to engine
    this.toolbar_.init(gfd.Controller.ToolModes.LINE_SPLATTER);
    
    
    
    
    this.optionsPanels_.init(gfd.Background.Mode.PAPER, 
        gfd.Palette.getRandomPalette());
    this.effectsPanel_.init(this.artBoardEl_); // Pass the artboard as a drop target
    this.infoPanels_.init(); // Info panel init
    
    
    
    this.hoverTimer_.start();
  }
};

gfd.Controller.prototype.load = function()
{
  if (!this.loaded_)
  {
    this.loaded_ = true;
    
    gfd.SvgArtElement.preload();
    
    goog.Timer.callOnce(this.load_, 500, this);
    
  }
};

/**
 * Delayed load. Because of hacky workarounds.
 */
gfd.Controller.prototype.load_ = function(e)
{
  var hash = window.location.hash;
  var m = /[^\d]*(\d+)[^\d]*/.exec(hash);
  var self = this;
  if (m)
  {
    // We need to load from database 
    goog.net.XhrIo.send('r?action=load', function(e) {
      var xhr = e.target;
      var obj = xhr.getResponseJson();
      if (obj)
      {
        self.open(obj);
      }}, 
      'POST', 
      'id=' + m[1]);
  }
};

/**
 * Called on the hover interval, checks whether the mouse has moved, if not
 * shows effect info for the art element under the point.
 * @param {goog.events.Event} e
 */
gfd.Controller.prototype.hoverTimerHandler_ = function(e)
{
  if (this.hoverPoint_.x === this.lastHoverPoint_.x && 
      this.hoverPoint_.y === this.lastHoverPoint_.y)
  {
    if (this.hoverCount_++ === 1)
    {
      var offset = goog.style.getClientPosition(this.artBoardEl_);
      
      var offsetX = this.hoverPoint_.x - offset.x;
      var offsetY = this.hoverPoint_.y - offset.y;
      
      if (this.artBoard_.contains(offsetX, offsetY))
      {
        var element = this.artBoard_.getElementUnderPoint(offsetX, offsetY);
        
        if (element)
        {
          this.showEffectInfoForElement(element);
        }
      }
    }
  }
  else
  {
    this.hoverCount_ = 0;
    this.lastHoverPoint_.x = this.hoverPoint_.x;
    this.lastHoverPoint_.y = this.hoverPoint_.y;
  }
};


/**
 * Called when the framerate falls below a certain threshold. Starts deleting
 * elements.
 * @param {goog.events.Event}
 * @private
 */
gfd.Controller.prototype.frameRateWarningHandler_ = function(e)
{
  // Here we got a frame rate warning we should remove filters from the oldest
  // items
  
  if (this.frameRateWarnCount_++ === 0)
  {
    this.effectsDelegate_.disableAnimations();
    
    this.confirmDialog_.setTitle('PERFORMANCE WARNING');
    this.confirmDialogAction_ = 'performance';
    this.confirmDialog_.setButtonSet(goog.ui.Dialog.ButtonSet.OK);
    this.confirmDialog_.setContent('It looks like the demo is running slow on this computer. Older elements will be automatically deleted to maintain the frame rate and animated filters will be disabled.');
    this.confirmDialog_.setVisible(true);
    this.enterModal_(true);
  }
  else
  {
    var elements = this.artBoard_.getElementsSorted();
    
    if (elements.length > 1)
    {
      elements.sort(gfd.ArtElement.sortByLruAndDepthAndIndex);
      
      var numToChange = 1;

      for (var i = elements.length - 1; i > 0 && numToChange; --i)
      {
        if (elements[i] === this.background_.getArtElement()) continue;
        
        //TODO: here it would be nice to decide whether to just remove the effect
        // or if we should delete the whole object altogether. For now opting
        // for deleting the whole object since removing just the effect could
        // be confusing.
        /*
        if (this.effectsDelegate_.getEffectByArtElement(elements[i]))
        {
          this.effectsDelegate_.applyEffectToArtElement(elements[i], null);
          numToChange--;
        }
        */
        
        this.artBoard_.removeArtElement(elements[i]);
        numToChange--;
      }
    } 
  }
};


/**
 * Saves the current document.
 */
gfd.Controller.prototype.save = function()
{
  var bgEl = this.background_.getArtElement();
  
  // Serialize the artboard
  var elements = this.artBoard_.getElementsSorted();
  var serializedElements = [];
  
  for (var i = 0; i < elements.length; i++)
  {
    if (elements[i] !== bgEl)
    {
      serializedElements.push(gfd.Serializer.serialize(elements[i]));
    }
  }
  
  // Serialize the effects
  var serializedEffects = [];
  var effects = this.effectsDelegate_.getCustomEffects();
  
  for (var i = 0; i < effects.length; i++)
  {
    serializedEffects[i] = gfd.Serializer.serialize(effects[i]);
  }
  
  var bgfx = null;
  
  if (bgEl)
  {
    var effect = this.effectsDelegate_.getEffectByArtElement(bgEl);
    if (effect) bgfx = effect.getId();
  }
  
  var saveString = JSON.stringify({
                    'version': gfd.Constants.GFD_VERSION,
                    'width': this.artBoard_.getWidth(),
                    'height': this.artBoard_.getHeight(),
                    'palette': this.artBoard_.getPaletteName(),
                    'bg': this.background_.getMode(),
                    'bgfx': bgfx,
                    'elements': serializedElements,
                    'fx': serializedEffects,
                    'fxmap': this.effectsDelegate_.getEffectMap()
                  });
  
  //console.log(saveString);
  //We need to load from database
  var self = this;
  goog.net.XhrIo.send('r?action=save', function(e) {
      var xhr = e.target;
      var obj = xhr.getResponseJson();
      
      if (obj && obj.id) self.showShareString(obj.id);
      else self.showShareString(null);
    }, 
    'POST', 
    'version=' + gfd.Constants.GFD_VERSION + '&data=' + saveString);
  
  saveString = null;
  serializedEffects = null;
  elements = null;
  effects = null;
};

/**
 * Opens the given json string.
 * @param {string|Object} str
 */
gfd.Controller.prototype.open = function(str)
{
  var i;
  var obj = (typeof str) === 'string' ? JSON.parse(str) : str;
  
  
  // Clear everything
  this.background_.setMode(gfd.Background.Mode.NONE);
  this.deselect();
  this.effectsDelegate_.clear();
  this.artBoard_.clear();
  
  if (!obj) return;
  
  this.optionsPanels_.selectPalette(obj['palette']);
  
  var elements = {};
  // TODO: should we set the width/height of the artboard or is it always ful
  // screen
  for (i = 0; i < obj['elements'].length; i++)
  {
    var element = gfd.Serializer.deserialize(obj['elements'][i]);
    if (element)
    {
      this.artBoard_.addArtElement(element);
      elements[element.hash()] = element;
    }
  }
  
  
  for (i = 0; i < obj['fx'].length; i++)
  {
    var effect = gfd.Serializer.deserialize(obj['fx'][i]);
    if (effect)
    {
      this.effectsDelegate_.addFilterEffect(effect);
      this.effectsPanel_.addEffect(effect);
    }
  }
  
  for (var elementId in obj['fxmap'])
  {
    if (elements[elementId])
    {
      this.effectsDelegate_.applyEffectToArtElement(elements[elementId], 
          obj['fxmap'][elementId]);
    }
  }
  
  this.background_.setMode(obj['bg'], obj['bgfx']);
  
  
  this.optionsPanels_.selectBackground(obj['bg']);  
};

/**
 * After save displays results.
 * @param {?string} id
 */
gfd.Controller.prototype.showShareString = function(id)
{
  this.confirmDialog_.setTitle('SHARE');
  this.confirmDialogAction_ = 'share';
  this.confirmDialog_.setButtonSet(goog.ui.Dialog.ButtonSet.OK);
  if (id)
  {
    var url = 'http://cssfilters.appspot.com/#/' + id;
    this.confirmDialog_.setContent('Your artwork has been saved! You can use this url to share it: <a href=\'' + url +'\'>' + url + '</a>');
  }
  else
  {
    this.confirmDialog_.setContent('An error occured while trying to save this artwork :(');
  }
  this.confirmDialog_.setVisible(true);
  this.enterModal_(true);
};

/**
 * Deletes the current selection.
 */
gfd.Controller.prototype.deleteSelection = function()
{
  this.confirmDialog_.setTitle('DELETE');
  this.confirmDialogAction_ = 'delete';
  this.confirmDialog_.setButtonSet(goog.ui.Dialog.ButtonSet.YES_NO);
  this.confirmDialog_.setContent('Are you sure you want to delete the selected item?');
  this.confirmDialog_.setVisible(true);
  this.enterModal_(true);
};

/**
 * Selects the element under the point and returns a selection object.
 * @param {number} x
 * @param {number} y
 * @param {boolean=} opt_bg
 * @returns {gfd.Selection}
 */
gfd.Controller.prototype.selectElementUnderPoint = function(x, y, opt_bg)
{
  var selection = this.artBoard_.getSelectionUnderPoint(x, y);
  
  if (this.selection_ && (!selection || selection.artEl !== this.selection_.artEl))
  {
    this.selection_.artEl.deselect(this.selection_);
    this.effectsDelegate_.enableEffectsForArtElement(this.selection_.artEl, true);
  }
  
  if (selection &&  selection.artEl == this.background_.getArtElement() && !opt_bg)
  {
    // Don't allow selection of background unless specific case
    selection = null;
  }
  
  if (this.selection_ = selection)
  {
    this.selection_.artEl.select(this.selection_);
    // Temporarily disable filters on the element
    this.effectsDelegate_.enableEffectsForArtElement(this.selection_.artEl, false);
  }
  
  return this.selection_;
};

/**
 * Deselects the current selection.
 */
gfd.Controller.prototype.deselect = function()
{
  if (this.selection_)
  {
    this.selection_.artEl.deselect(this.selection_);
    this.effectsDelegate_.enableEffectsForArtElement(this.selection_.artEl, true);
    this.selection_ = null;
  }
};





/**
 * Called when a mouseDown occurs on the artboard.
 * @param {goog.events.BrowserEvent} e The mouse event.
 * @private
 */
gfd.Controller.prototype.mouseDownHandler_ = function(e)
{
  // Coordinates relative to artboard
  this.artBoardPos_ = goog.style.getClientPosition(this.artBoardEl_);

  var x = e.clientX - this.artBoardPos_.x;
  var y = e.clientY - this.artBoardPos_.y;
  
  this.drawBounds_.left = this.drawBounds_.right = x;
  this.drawBounds_.top = this.drawBounds_.bottom = y;

  // Check if we are a tool that just needs the click
  switch (this.toolMode_)
  {
    case gfd.Controller.ToolModes.DELETE:
      if (this.selectElementUnderPoint(x, y)) this.deleteSelection();
      break;
    
    case gfd.Controller.ToolModes.RANDOMIZE:
      // Select Item under pint
      if (selection = this.artBoard_.getElementUnderPoint(x, y))
      {
        selection.touch();
        this.effectsDelegate_.applyRandomEffectToArtElement(selection);
      }
      break;
      
    case gfd.Controller.ToolModes.EYEDROPPER:
      // Select Item under pint
      if (selection = this.artBoard_.getElementUnderPoint(x, y))
      {
        selection.touch();
        this.showEffectInfoForElement(selection);
      }
      break;
      
    case gfd.Controller.ToolModes.TRANSFORM:
      if (selection = this.selectElementUnderPoint(x, y))
      {
        selection.artEl.touch();
        this.drawBounds_.right = this.drawBounds_.bottom = 0;
        this.dragging_ = true;
      }
      break;
    
    // Everything else is a tool
    default:
      
      // Do we want to draw or drag.
      // If there is an item selected and this point hit the selected item then 
      // we're going to drag it. Otherwise its a new drawing
      if ((this.selection_ && this.artBoard_.getElementUnderPoint(x, y) ===
        this.selection_.artEl))
      {
        this.dragging_ = true;
        this.drawBounds_.right = this.drawBounds_.bottom = 0;
      }
      else
      {
        if (this.numDrawPoints_) // Maybe mouse up outside window?
        {
          this.numDrawPoints_ = 0;
        }
      
        this.drawPoints_[0].x = x;
        this.drawPoints_[0].y = y;
        this.lastDrawPoint_ = this.drawPoints_[0];
        this.numDrawPoints_ = 1;
        
        this.drawing_ = true;
        this.artBoard_.beginDrawing();
      }
      break;
  }
  
  if (this.dragging_ || this.drawing_)
  {
    this.hoverTimer_.stop();
    this.artBoard_.freeze(true); // Stop the artboard from updating children
    this.effectsDelegate_.freeze(); // Stop animating filters
  }
};

/**
 * @private
 * Called when a mouse up occurs after a mousedown.
 */
gfd.Controller.prototype.mouseUpHandler_ = function(e)
{
  if (this.dragging_ || this.drawing_)
  {
    this.hoverTimer_.start();
  }
  
  if (this.dragging_)
  {
    var artEl = this.selection_ ? this.selection_.artEl : null;
    
    if (artEl)
    {
      this.deselect();
      // We've changed the rectangle's position. This is fine for some elements
      // that render themselves regardless of borders, but canvases only render
      // out to the border, so they need to have their innards transformed and
      // re-render. 
      // WebGl, transform all inner data, update rect.
      // Canvas, transform all inner data, update rect.
      // SVG, just move it.
      // Videos, just move it.
      artEl.translate(this.drawBounds_.right, this.drawBounds_.bottom);
    }
    this.dragging_ = false;
  }
  if (this.drawing_)
  {
    if (this.numDrawPoints_ > 10 && 
        (this.drawBounds_.right - this.drawBounds_.left) > 5 && 
        (this.drawBounds_.bottom - this.drawBounds_.top) > 5)
    {
      // Simplify point array by removing colinear points
      var newPoints = gfd.Point.simplify(this.drawPoints_, 
          this.numDrawPoints_, 0.5);
      
      
      /*
  // Finds number of intersections
      var it;
      if (it = gfd.findPolygonIntersections(newPoints, false))
      {
        //alert('found ' + it.length + ' intersections.');
      }
      else
      {
        alert('simple');
      }
      */
      
      //var result = this.recognizer_.Recognize(points, true); 
      
      var rect = new gfd.Rectangle(this.drawBounds_.left, this.drawBounds_.top,
          this.drawBounds_.right - this.drawBounds_.left,
          this.drawBounds_.bottom - this.drawBounds_.top);
      
      var handled = false;
      var lastElement = this.artBoard_.getElementWithFocus();
      switch (this.toolMode_)
      {
        case gfd.Controller.ToolModes.CUTOUT_PAINTER:
          handled = (lastElement instanceof gfd.WebGlPaintElement && lastElement.handleData(rect, newPoints));
          break;
      };
      
    
      if (!handled)
      {
        var artEl;
        
        switch (this.toolMode_)
        {
          case gfd.Controller.ToolModes.CUTOUT_PAINTER:
            if (artEl = gfd.WebGlArtElement.create(this, gfd.WebGlPaintElement))
            {
              artEl.initWithData(rect, newPoints);
            }
            break;
            
          case gfd.Controller.ToolModes.LINE_SPLATTER:
            if (artEl = gfd.WebGlArtElement.create(this, gfd.WebGlTriElement))
            {
              artEl.initWithData(rect, newPoints, undefined, 
                  Math.random() > 0.3 ? gfd.WebGlTriElement.Mode.WAVES : 
                                        gfd.WebGlTriElement.Mode.STATIC);
            }
            break;
            
          case gfd.Controller.ToolModes.RAINBOW_SURFER:
            rect.x = 0;
            rect.y = 0;
            rect.width = this.artBoard_.getWidth();
            rect.height = this.artBoard_.getHeight();
            
            var thin = Math.random() > 0.5;
            //artEl = new gfd.SvgGestureShapeElement().initWithData('gesture', rect, newPoints);
            if (newPoints.length < 50)
            {
              if (artEl = gfd.CanvasArtElement.create(this, 
                              gfd.CanvasRainbowSurferElement))
              {
                artEl.initWithData(rect, 
                  newPoints,
                  5, 25, 27);
              }
            }
            else
            {
              if (artEl = gfd.CanvasArtElement.create(this,
                              gfd.CanvasRainbowSurferElement))
              {
                artEl.initWithData(rect, 
                    newPoints,
                    50, 6, 2);//8, 10, 12);
              }
            }
            break;
            
          case gfd.Controller.ToolModes.GESTURE_SHAPER:
            if (artEl = gfd.SvgArtElement.create(this, 
                          gfd.SvgGestureShapeElement))
            {
              artEl.initWithData('gesture', rect, newPoints);
            }
            //artEl = new gfd.SvgRainbowSurferElement().initWithData(rect, newPoints);
            break;
            
          
        };
        
        if (artEl)
        {
          this.artBoard_.addArtElement(artEl);
          artEl.release();
          
          if (gfd.Constants.AUTO_APPLY_EFFECTS)
          {
            this.effectsDelegate_.applyRandomEffectToArtElement(artEl);
          }
          
          // If too many art elements remove the oldest
          if (this.artBoard_.getNumElements() > gfd.Constants.MAX_ARTBOARD_ELEMENTS)
          {
            var elements = this.artBoard_.getElementsSorted();
            elements.shift(); // Remove background
            elements.sort(gfd.ArtElement.sortByLruAndDepthAndIndex);
            this.artBoard_.removeArtElement(elements[elements.length - 1]);
          }
            
        }
      }
    }
    else
    {
      // Try to do a selection
      var dP = this.drawPoints_[0];
      var lP = this.drawPoints_[this.numDrawPoints_ - 1];
      var distX = dP.x - lP.x;
      var distY = dP.y - lP.y;
      
      var dist = Math.sqrt(distX * distX + distY * distY);
      if (dist < 10)
      {
        this.selectElementUnderPoint(dP.x, dP.y);
      }
    }

    this.drawing_ = false;
    this.artBoard_.endDrawing();

    if (this.numDrawPoints_) this.numDrawPoints_ = 0;
  }
  
  //Restart the engine so items can begin rendering again
  this.artBoard_.freeze(false);
  // Unfreeze any animated effects
  this.effectsDelegate_.unfreeze();
};

/**
 * Called when mouse moves on artboard.
 * @param e
 */
gfd.Controller.prototype.mouseMoveHandler_ = function(e)
{
  var x, y;

  if (this.drawing_)
  {
    if (this.numDrawPoints_ < gfd.Constants.MAX_DRAW_POINTS)
    {
      x = e.clientX - this.artBoardPos_.x;
      y = e.clientY - this.artBoardPos_.y;
      
      // Don't add point if not contained in artboard
      if (this.artBoard_.contains(x, y))
      {
        var p;
        // Don't bother if just a one pixel move
        if (Math.abs(x - this.lastDrawPoint_.x) > 1 ||
            Math.abs(y - this.lastDrawPoint_.y) > 1)
        {
          if (x < this.drawBounds_.left) this.drawBounds_.left = x;
          else if (x > this.drawBounds_.right) this.drawBounds_.right = x;
          if (y < this.drawBounds_.top) this.drawBounds_.top = y;
          else if (y > this.drawBounds_.bottom) this.drawBounds_.bottom = y;
          
          if (!(p = this.drawPoints_[this.numDrawPoints_]))
          {
            this.drawPoints_[this.numDrawPoints_] = p = new gfd.Point();
          }
        
          p.x = x;
          p.y = y;
          
          this.artBoard_.drawStroke(this.lastDrawPoint_.x,
                                    this.lastDrawPoint_.y, 
                                    x, 
                                    y);
          
          this.lastDrawPoint_ = p;
          this.numDrawPoints_++;
        }
      }
    }
  }
  else if (this.dragging_)
  {
    x = e.clientX - this.artBoardPos_.x;
    y = e.clientY - this.artBoardPos_.y;
    
    var artEl = this.selection_ ? this.selection_.artEl : null;
    
    if (artEl)
    {
      var container = artEl.getDomEl();
      var rect = artEl.getRect();
      this.drawBounds_.right = x - this.drawBounds_.left;
      this.drawBounds_.bottom = y - this.drawBounds_.top;
      container.style.left = (rect.x + this.drawBounds_.right) + 'px';
      container.style.top = (rect.y + this.drawBounds_.bottom) + 'px';
    }
  }
  else
  {
    this.hoverPoint_.x = e.clientX;
    this.hoverPoint_.y = e.clientY;
  }

};

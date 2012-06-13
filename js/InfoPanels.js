/**
 * @fileoverview UI Element for dealing with displaying the CSS info for 
 * effects. Currently this also holds the help panel but this should probably
 * be organized.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.InfoPanels');

goog.require('gfd.ArtElement');
goog.require('goog.events.Event');

/**
 * Handles two of the dropdowns.
 * @constructor
 */
gfd.InfoPanels = function()
{
  /**
   * Flag indicating if the intro panel is still showing.
   * @type {boolean}
   * @private
   */
  this.helpShowing_ = false;
  
  /**
   * The help button on the header.
   * @type {Element}
   * @private
   */
  this.helpButtonEl_ = document.getElementById('gfd-help-button');
  
  /**
   * @type {Element}
   * @private
   */
  this.helpEl_ = document.getElementById('gfd-help');

  /**
   * The info portion.
   * @type {Element}
   * @private
   */
  this.filterInfoEl_ = document.getElementById('gfd-filter-info');
  
  /**
   * An object used to display the filter script to the user.
   * @type {Element}
   * @private
   */
  this.filterCssEl_ = document.getElementById('gfd-filter-info-css');
  
  /**
   * An object used to display the filter description to the user.
   * @type {Element}
   * @private
   */
  this.filterDescEl_ = document.getElementById('gfd-filter-info-desc');
  
  /**
   * @type {string}
   * @private
   */
  this.curFilterInfo_ = null;
  
  /**
   * @type {string}
   * @private
   */
  this.curElType_ = null;
};

/**
 * Initializes the panel.
 */
gfd.InfoPanels.prototype.init = function()
{
  if (this.filterInfoEl_)
  {
    this.filterInfoEl_.style.opacity = '0';
    
    goog.events.listen(this.filterInfoEl_, 'webkitTransitionEnd',
        this.showEffectInfoNow_, false, this);
  }
  

  if (this.helpEl_)
  {
    if (this.helpButtonEl_)
    {
      goog.events.listen(this.helpButtonEl_, 'click', this.showHelp, false, this);
    }

    goog.events.listen(this.helpEl_, 'webkitTransitionEnd',
        function(e) { 
          if (parseFloat(e.target.style.opacity) < 0.5)
          {
            e.target.style.display = 'none';
          }
    });
    
    
    goog.Timer.callOnce(this.showHelp, 500, this);
  }
};



/**
 * Called on a global mousedown to close the help.
 * @param {goog.events.Event} e
 */
gfd.InfoPanels.prototype.mouseDown_ = function(e)
{
  if (this.helpShowing_)
  {
    var tl = goog.style.getClientPosition(this.helpEl_);
    var sz = goog.style.getSize(this.helpEl_);
    var coord = goog.style.getClientPosition(e);
    
    if (coord.x < tl.x || coord.y < tl.y ||
        coord.x > tl.x + sz.width || coord.y > tl.y + sz.height)
    {
      this.hideHelp();
    }
  }
};

/**
 * Shows effect info by queuing.
 * @param {Object} info
 * @param {gfd.ArtElement} opt_artEl
 */
gfd.InfoPanels.prototype.showEffectInfo = function(info, opt_artEl)
{
  if (info && this.filterCssEl_ && this.filterDescEl_)
  {
    var type = opt_artEl ? opt_artEl.getElementType() : 'element';
    var name = info.name;
    
    if (type && name && (type != this.curElType_ || !this.curFilterInfo_ || 
        this.curFilterInfo_.name != name))
    {
      this.curElType_ = type;
      this.curFilterInfo_ = info;
      
      // Animate and swap
      if (parseFloat(this.filterInfoEl_.style.opacity) <= 0)
      {
        this.showEffectInfoNow_(null);
      }
      else
      {
        this.filterInfoEl_.style.opacity = '0';
      }
    }
    
    
  }
};

/**
 * Handler for showing effect info after a fade.
 * @param {goog.events.Event} e
 */
gfd.InfoPanels.prototype.showEffectInfoNow_ = function(e)
{
  if (this.curFilterInfo_ && this.curElType_ && 
      parseFloat(this.filterInfoEl_.style.opacity) < 0.5)
  {
    var css = this.curFilterInfo_.css;
    var desc = this.curFilterInfo_.desc;
    var cssParsed = [];
    var reg = /(hue\-rotate|grayscale|sepia|blur|brightness|contrast|invert|saturate)\(([^\)]+)\)/g;
    var match = reg.exec(css);
    
    while (match)
    {
      cssParsed.push('&nbsp;&nbsp;<span class=\'filter-name\'>' + match[1] + 
          '</span>(<span class=\'filter-value\'>' + match[2] + '</span>)');
      match = reg.exec(css);
    }
  
    this.filterCssEl_.innerHTML = '<span class=\'element-name\'>#' + 
        this.curElType_ + '</span>.<span class=\'effect-name\'>' + 
        this.curFilterInfo_.name.toLowerCase() + '</span> {<br>' + cssParsed.join('<br>') + 
        ';<br>}';
    
    this.filterDescEl_.innerHTML = desc;
    
    // Re-display now that changed
    this.filterInfoEl_.style.opacity = '1';
  }
  
};

/**
 * Show the help panel
 * @param {goog.events.Event=} opt_e
 */
gfd.InfoPanels.prototype.showHelp = function(opt_e)
{
  if (!this.helpShowing_)
  {
    if (this.helpEl_)
    {
      this.helpEl_.style.display = 'block';
      goog.Timer.callOnce(function(){this.style.opacity = '1';}, 0, this.helpEl_);
    }
    
    goog.events.listen(document, 'mousedown', this.mouseDown_, false, this);
    this.helpShowing_ = true;
  }
};

/**
 * Hides intro.
 */
gfd.InfoPanels.prototype.hideHelp = function()
{
  if (this.helpShowing_)
  {
    if (this.helpEl_)
    {
      this.helpEl_.style.opacity = '0';
    }
    
    goog.events.unlisten(document, 'mousedown', this.mouseDown_);
    this.helpShowing_ = false;
  }
};
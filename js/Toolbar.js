/**
 * @fileoverview UI Element for the toolbar.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Toolbar');

goog.require('goog.ui.Container');
goog.require('goog.ui.Control');
goog.require('goog.dom.classes');
goog.require('goog.dom.query');
goog.require('goog.events.EventTarget');
goog.require('goog.ui.AnimatedZippy');



/**
 * @extends {goog.events.EventTarget}
 * @constructor
 */
gfd.Toolbar = function()
{
  goog.events.EventTarget.call(this);
  
  /**
   * @type {Array.<goog.ui.AnimatedZippy>}
   * @private
   */
  this.brushes_ = [];
  
  /**
   * @type {string}
   * @private
   */
  this.selectedBrush_ = '';
};
goog.inherits(gfd.Toolbar, goog.events.EventTarget);

/**
 * Initializes the toolbar by adding everything to the dom.
 * @param {String} opt_brush an optional brush to select
 */
gfd.Toolbar.prototype.init = function(opt_brush)
{
  // Collect all items with a data-brush attribute
  var result = goog.dom.query('[data-brush]');
  
  for (var i = 0; i < result.length; i++)
  {
    var children = goog.dom.query('div', result[i]);
    var header = children[0];
    var content = children[1];
    
    var icon = document.createElement('div');
    icon.className = 'icon ' + result[i].getAttribute('data-brush');
    
    var headerContent = document.createElement('div');
    headerContent.innerHTML = header.innerHTML;
    header.innerHTML = '';
    
    header.appendChild(icon);
    header.appendChild(headerContent);

    this.brushes_[i] = new goog.ui.AnimatedZippy(header, content, false);
    goog.events.listen(this.brushes_[i], goog.ui.Zippy.Events.ACTION, this.actionHandler_, false, this);
  }
  
  if (opt_brush)
  {
    this.selectBrush(opt_brush);
  }
};


/**
 * @returns {string}
 */
gfd.Toolbar.prototype.getSelectedBrush = function()
{
  return this.selectedBrush_;
};


/**
 * @param {string} brush
 * @param {boolean=} opt_dontExpand
 */
gfd.Toolbar.prototype.selectBrush = function(brush, opt_dontExpand)
{
  if (brush != this.selectedBrush_)
  {
    for (var i = this.brushes_.length - 1; i >= 0; --i)
    {
      var header = this.brushes_[i].getVisibleHeaderElement();
      
      //console.log(header.parentNode.getAttribute('data-brush') + ':' + brush);
      if (header.parentNode.getAttribute('data-brush') != brush)
      {
        this.brushes_[i].collapse();
        goog.dom.classes.remove(header.parentNode, 'selected');
      }
      else
      {
        if (!opt_dontExpand) this.brushes_[i].expand();
        goog.dom.classes.add(header.parentNode, 'selected');
      }
    }
    
    this.selectedBrush_ = brush;
    this.dispatchEvent('click');
  }
};

/**
 * 
 * @param {goog.events.Event} e
 */
gfd.Toolbar.prototype.actionHandler_ = function(e)
{
  this.selectBrush(e.target.getVisibleHeaderElement().
            parentNode.getAttribute('data-brush'), true);
};


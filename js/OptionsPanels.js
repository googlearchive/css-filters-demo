/**
 * @fileoverview UI Element for dealing with drop downs for the palette and
 * background selectors.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.OptionsPanels');

goog.require('goog.ui.AnimatedZippyUp');
goog.require('goog.events');
goog.require('goog.array');
goog.require('goog.dom.classes');
goog.require('goog.dom.query');
goog.require('goog.events.EventTarget');
goog.require('goog.Timer');

goog.require('gfd.ArtistPalettes');

/**
 * @extends {goog.events.EventTarget}
 * @constructor
 */
gfd.OptionsPanels = function()
{
  goog.events.EventTarget.call(this);

  /**
   * @type {goog.ui.AnimatedZippy}
   * @private
   */
  this.backgroundsZippy_ = null;

  /**
   * @type {goog.ui.AnimatedZippy}
   * @private
   */
  this.palettesZippy_ = null;

  /**
   * @type {Object.<string, Object>}
   * @private
   */
  this.palettesData_ = {};
  
  /**
   * @type {Array.<Object>}
   * @private
   */
  this.palettesDataArray_ = [];
  
  /**
   * Holds info for backgrounds.
   * @type {Object.<string,Object>}
   * @private
   */
  this.backgroundsData_ = {};
  
  /**
   * @type {string}
   * @private
   */
  this.selectedPalette_ = null;
  
  /**
   * Keeps track of selected palette el.
   * @type {Element}
   * @private
   */
  this.selectedPaletteEl_ = null;
  
  /**
   * Seleted background.
   * @type {string}
   * @private
   */
  this.selectedBackground_ = null;
  
  /**
   * Keeps track of selected background element.
   * @type {Element}
   * @private
   */
  this.selectedBackgroundEl_ = null;
  
  /**
   * @type {number}
   * @private
   */
  this.paletteCycle_ = -1;
  
  /**
   * @type {goog.Timer}
   * @private
   */
  this.cycleTimer_ = new goog.Timer(40);
  
};
goog.inherits(gfd.OptionsPanels, goog.events.EventTarget);

/**
 * Handler
 * @param {goog.events.Event} e
 */
gfd.OptionsPanels.prototype.toggleHandler_ = function(e)
{
  if (e.target.isExpanded())
  {
    goog.dom.classes.add(e.target.getVisibleHeaderElement(), 
        'gfd-options-header-open');
  }
  else
  {
    goog.dom.classes.remove(e.target.getVisibleHeaderElement(), 
        'gfd-options-header-open');
  }
};

/**
 * Handler
 * @param {goog.events.Event} e
 */
gfd.OptionsPanels.prototype.bgClickHandler_ = function(e)
{
  this.backgroundsZippy_.collapse();
  this.selectBackground(e.target.getAttribute('data-background'));
};

/**
 * Handler
 * @param {goog.events.Event} e
 */
gfd.OptionsPanels.prototype.palClickHandler_ = function(e)
{
  this.palettesZippy_.collapse();
  this.selectPalette(e.target.getAttribute('data-palette'));
};

/**
 * Selects a palette based on a string id.
 * @param {string} id
 */
gfd.OptionsPanels.prototype.selectPalette = function(id)
{
  if (id && this.palettesData_[id])
  {
    if (id != this.selectedPalette_)
    {
      this.selectedPalette_ = id;
      this.selectedPaletteEl_.innerHTML = this.palettesData_[id].name;
      this.dispatchEvent('palette');
    }
  }
};

/**
 * Selects a background based on a string id.
 * @param {string} id
 */
gfd.OptionsPanels.prototype.selectBackground = function(id)
{
  if (id && this.backgroundsData_[id])
  {
    if (id != this.selectedBackground_)
    {
      this.selectedBackground_ = id;
      this.selectedBackgroundEl_.innerHTML = this.backgroundsData_[id].name;
      this.dispatchEvent('background');
    }
  }
};

/**
 * Selects a palette based on a string id.
 * @param {string} id
 */
gfd.OptionsPanels.prototype.getSelectedPaletteId = function()
{
  return this.selectedPalette_;
};

/**
 * Returns the selected background.
 * @returns {string]
 */
gfd.OptionsPanels.prototype.getSelectedBackgroundId = function()
{
  return this.selectedBackground_;
};

/**
 * Sets up the palette data from the dom info.
 * @param {Element} el
 */
gfd.OptionsPanels.prototype.initPaletteItem_ = function(el)
{
  var icon, cells, pal, id = el.getAttribute('data-palette'), self = this;
  
  // See if the palette exists
  pal = gfd.ArtistPalettes[id];
  
  if (pal)
  {
    var data = { 
        name: el.innerHTML,
        palette: pal,
        icon: icon = goog.dom.createDom('table', 'gfd-palette-icon'),
        iconCells: cells = [],
        iconIndex: 0
        };
    
    var index = this.palettesDataArray_.length;
    
    this.palettesData_[el.getAttribute('data-palette')] = data;
    this.palettesDataArray_.push(data);
    
    var n = 0;
    while (n < 9)
    {
      icon.appendChild(goog.dom.createDom('tr', null,
          cells[n++] = goog.dom.createDom('td', null),
          cells[n++] = goog.dom.createDom('td', null),
          cells[n++] = goog.dom.createDom('td', null)));
    }
    
    el.insertBefore(icon, el.firstChild);
    
    
    goog.events.listen(el, 'click', function(e){self.palClickHandler_(e);});
    goog.events.listen(el, 'mouseover', function(e){
      var c;
      if ((c = self.paletteCycle_) !== index)
      {
        self.paletteCycle_ = index;
        if (c === -1) self.cycleTimer_.start();
      }});
    
    goog.events.listen(el, 'mouseout', function(e){
      if (self.paletteCycle_ === index)
      {
        self.cycleTimer_.stop();
        self.paletteCycle_ = -1;
      }});
    
    self.cyclePalettes_(index);
      
  }
  else
  {
    // Disable it
  }
};

/**
 * Makes th palette animation go.
 * @param {number} index
 */
gfd.OptionsPanels.prototype.cyclePalettes_ = function(index)
{
  var palData = this.palettesDataArray_[index];

  var index = palData.iconIndex+1+((Math.random() * 30)|0);
  var pal = palData.palette;
  var n = pal.length;
  var cells = palData.iconCells;
  var c = cells.length;
  
  for (var i = 0; i < c; ++i)
  {
    cells[i].style.backgroundColor = pal[(index + i) % n].toCssColorString();
  }
};


/**
 * Initializes.
 * @param {string=} opt_selBg
 * @param {string=} opt_selPal
 */
gfd.OptionsPanels.prototype.init = function(opt_selBg, opt_selPal)
{
  var c, self = this;
  
  if (document.getElementById('gfd-backgrounds'))
  {
    this.backgroundsZippy_ = new goog.ui.AnimatedZippyUp(
        goog.dom.query('#gfd-backgrounds .gfd-options-header')[0], 
        c = goog.dom.query('#gfd-backgrounds .gfd-options-content')[0]);
  
    this.selectedBackgroundEl_ = goog.dom.query('#gfd-backgrounds .gfd-options-selection')[0];
    
    goog.events.listen(this.backgroundsZippy_, goog.ui.Zippy.Events.TOGGLE, 
       function(e){self.toggleHandler_(e);});
    
    //goog.events.listen(this.backgroundsZippy_, goog.ui.Zippy.Events.ACTION,
      //  function(e){self.actionHandler_(e);});
   
    goog.array.forEach(goog.dom.query('[data-background]',c),
       function(o) {
  
         self.backgroundsData_[o.getAttribute('data-background')] = { 
             name: o.innerHTML,
             tooltip: o.getAttribute('data-tooltip')};
         goog.events.listen(o, 'click', function(e){self.bgClickHandler_(e);});
       });
  }
  
  if (document.getElementById('gfd-palettes'))
  {
    this.palettesZippy_ = new goog.ui.AnimatedZippyUp(
       goog.dom.query('#gfd-palettes .gfd-options-header')[0], 
       c = goog.dom.query('#gfd-palettes .gfd-options-content')[0]);
    
    this.selectedPaletteEl_ = goog.dom.query('#gfd-palettes .gfd-options-selection')[0];
   
    goog.events.listen(this.palettesZippy_, goog.ui.Zippy.Events.TOGGLE, 
       function(e){self.toggleHandler_(e);});
    
    //goog.events.listen(this.palettesZippy_, goog.ui.Zippy.Events.ACTION,
      //  function(e){self.actionHandler_(e);});
   
    goog.array.forEach(goog.dom.query('[data-palette]',c),
       function(o) {self.initPaletteItem_(o);});
  
    goog.events.listen(this.cycleTimer_, goog.Timer.TICK, function(e) {
      self.cyclePalettes_(self.paletteCycle_);
    });
  }
  
  if (opt_selBg) this.selectBackground(opt_selBg);
  if (opt_selPal) this.selectPalette(opt_selPal);
};

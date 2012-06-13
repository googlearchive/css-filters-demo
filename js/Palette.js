/**
 * @fileoverview UI Element for dealing with drop downs for the palette and
 * background selectors.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Palette');
goog.provide('gfd.RandomPalette');

goog.require('gfd.ArtistPalettes');
goog.require('gfd.Random');




/**
 * A Palette to hold a set of colors for use in a document.
 * @constructor
 */
gfd.Palette = function()
{
  /**
   * The color array for the palette
   * @type {?Array.<gfd.Color>}
   * @private
   */
  this.colors_ = null;
  
  /**
   * The palette name
   * @type {string}
   * @private
   */
  this.name_ = '';
  
  /**
   * The number of colors in the palette.
   * @type {number}
   * @private
   */
  this.numColors_ = 0;
  
  /**
   * A modulo for the color array to use any index.
   * @type {number}
   * @private
   */
  this.colorMod_ = 0;
};


/**
 * Palette lookup.
 * @type {Object.<string,gfd.Palette>}
 * @private
 */
gfd.Palette.palettes_ = {};

/**
 * Grabs the name of a random artist palette.
 * @returns {string}
 */
gfd.Palette.getRandomPalette = function()
{
  var idx, pal, numPalettes = 0;
  for (pal in gfd.ArtistPalettes)
  {
    numPalettes++;
  }
  
  idx = (Math.random() * numPalettes) | 0;
  
  for (pal in gfd.ArtistPalettes)
  {
    if (idx-- === 0)
    {
      return pal;
    }
  } 
};


/**
 * Returns a palette given a palette name.
 * @returns {gfd.Palette}
 */
gfd.Palette.getPaletteByName = function(name)
{
  var pal = gfd.Palette.palettes_[name];
  if (!pal)
  {
    pal = new gfd.Palette();
    if (!pal.setToArtistPalette(name)) return;
  }
  
  gfd.Palette.palettes_[name] = pal;
  return pal;
};

/**
 * Sets the palette to the colors used
 */
gfd.Palette.prototype.setToArtistPalette = function(name)
{
  //name = name.replace(/-/g, '_').toUpperCase();
  
  if (this.colors_ = gfd.ArtistPalettes[name])
  {
    this.name_ = name;
    var v = this.colors_.length;
    v--;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    
    if (v != this.colors_.length)
    {
      var oldLength = this.colors_.length;
      for (var i = this.colors_.length; i < v; i++)
      {
        this.colors_[i] = this.colors_[i % oldLength];
      }
    }
    
    this.numColors_ = v;
    this.colorMod_ = this.numColors_ - 1;
    return true;
  }
  else
  {
    this.name_ = '';
    this.numColors_ = 0;
    return false;
  }
};

gfd.Palette.prototype.getName = function()
{
  return this.name_;
};

gfd.Palette.prototype.getNumColors = function()
{
  return this.numColors_;
};

gfd.Palette.prototype.getColorAt = function(index)
{
  return this.colors_ && index >= 0 ? this.colors_[index & this.colorMod_] : null;
};

gfd.Palette.prototype.getColorArray = function()
{
  return this.colors_;
};



/**
 * A RandomPalette allows an object to hold a reference to it to access another
 * palette in a pseudo random way. So the palette can be seeded and always
 * return the same colors.
 * @param opt_seed
 * @constructor
 */
gfd.RandomPalette = function(opt_seed)
{
  this.paletteSeed_ = goog.isDef(opt_seed) ? opt_seed : goog.now();
  
  this.palette_ = gfd.RandomPalette.palettePool_.length ? 
      gfd.RandomPalette.palettePool_.pop() : new Array(256);
      
  gfd.Random.seed(this.paletteSeed_);
  
  for (var i = 0; i < 256; i++)
  {
    this.palette_[i] = (gfd.Random.next() * 256) | 0;
  }
};

/**
 * A static pool for palette arrays. Just to reuse that data. Probably not 
 * necessary though.
 * @type {Array.<Array.<number>>}
 * @private
 */
gfd.RandomPalette.palettePool_ = [];


gfd.RandomPalette.prototype.dispose = function()
{
  if (this.palette_)
  {
    gfd.RandomPalette.palettePool_.push(this.palette_);
    this.palette_ = null;
  }
};

gfd.RandomPalette.prototype.get = function(palette, index)
{
  return palette.colors_[this.palette_[index & 255] & palette.colorMod_];
};

gfd.RandomPalette.prototype.getColorString = function(palette, index)
{
  return palette.colors_[this.palette_[index & 255] & palette.colorMod_].
    toCssColorString();
};

gfd.RandomPalette.prototype.getSeed = function()
{
  return this.paletteSeed_;
};




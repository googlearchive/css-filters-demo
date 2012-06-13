/**
 * @fileoverview Basic tesselation code for WebGL.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Triangulate');
goog.provide('gfd.Triangulate.process');
goog.provide('gfd.Triangulate.inside');

goog.require('gfd.Point');

/**
 * Static method to process points and return an index array.
 * @param {Array.<Object>} points
 * @returns Array.<Number>
 */
gfd.Triangulate.process = function(points)
{
  // allocate and initialize list of Vertices in polygon 
  var result = [];
  var rn = 0;
  var v;
  var n = points.length;
  if (n < 3) return null;

  var V = [];

  /* we want a counter-clockwise polygon in V */
  if ( 0 < gfd.Triangulate.area_(points) )
    for(v=0; v<n; v++) V[v] = v;
  else
  {
    for(v=0; v<n; v++) V[v] = (n-1)-v;
  }

  var nv = n;

  /*  remove nv-2 Vertices, creating 1 triangle every time */
  var count = 2*nv;   /* error detection */

  for(var m=0, v=nv-1; nv>2; )
  {
    /* if we loop, it is probably a non-simple polygon */
    if (0 >= (count--))
    {
      //** Triangulate: ERROR - probable bad polygon!
      return null;
    }

    /* three consecutive vertices in current polygon, <u,v,w> */
    var u = v; if (nv <= u) u = 0;     /* previous */
    v = u+1; if (nv <= v) v = 0;     /* new v    */
    var w = v+1; if (nv <= w) w = 0;     /* next     */

    if (gfd.Triangulate.snip_(points,u,v,w,nv,V) )
    {
      var a,b,c,s,t;

      /* true names of the vertices */
      a = V[u]; b = V[v]; c = V[w];

      /* output Triangle */
      result[rn++] = a;
      result[rn++] = b;
      result[rn++] = c;
      /*
        result[rn++] = points[a].x;
        result[rn++] = points[a].y;
        result[rn++] = 0;
        result[rn++] = points[b].x;
        result[rn++] = points[b].y;
        result[rn++] = 0;
        result[rn++] = points[c].x;
        result[rn++] = points[c].y;
        result[rn++] = 0;
*/

      m++;

      /* remove v from remaining polygon */
      for(s=v,t=v+1;t<nv;s++,t++){ V[s] = V[t];} nv--;

      /* resest error detection counter */
      count = 2*nv;
    }
  }

  return result;
};

/**
 * @param {Array.<gfd.Point>} contour
 * @private
 */
gfd.Triangulate.area_ = function(contour)
{
  var p, q, n = contour.length, A = 0;;
  for(p=n-1, q=0; q<n; p=q++)
  {
    A += contour[p].x*contour[q].y - contour[q].x*contour[p].y;
  }
  return A * 0.5; 
};

/**
 * @param {Number} Ax
 * @param {Number} Ay
 * @param {Number} Bx
 * @param {Number} By
 * @param {Number} Cx
 * @param {Number} Cy
 * @param {Number} Px
 * @param {Number} Py
 * @return {boolean} whether point P is inside the triangle ABC
 */
gfd.Triangulate.inside = function(Ax, Ay, 
                           Bx, By,
                           Cx, Cy,
                           Px, Py)
{
  var ax, ay, bx, by, cx, cy, apx, apy, bpx, bpy, cpx, cpy;
  var cCROSSap, bCROSScp, aCROSSbp;

  ax = Cx - Bx;  ay = Cy - By;
  bx = Ax - Cx;  by = Ay - Cy;
  cx = Bx - Ax;  cy = By - Ay;
  apx= Px - Ax;  apy= Py - Ay;
  bpx= Px - Bx;  bpy= Py - By;
  cpx= Px - Cx;  cpy= Py - Cy;

  aCROSSbp = ax*bpy - ay*bpx;
  cCROSSap = cx*apy - cy*apx;
  bCROSScp = bx*cpy - by*cpx;

  return ((aCROSSbp >= 0) && (bCROSScp >= 0) && (cCROSSap >= 0));
};

/**
 * @param {Array.<gfd.Point>} contour
 * @param {number} u
 * @param {number} v
 * @param {number} w
 * @param {number} n
 * @param {Array.<number>} V
 * @private
 */
gfd.Triangulate.snip_ = function(contour, u, v, w, n, V)
{
  var p;
  var Ax, Ay, Bx, By, Cx, Cy, Px, Py;

  Ax = contour[V[u]].x;
  Ay = contour[V[u]].y;

  Bx = contour[V[v]].x;
  By = contour[V[v]].y;

  Cx = contour[V[w]].x;
  Cy = contour[V[w]].y;

  if (0.000000001 > (((Bx-Ax)*(Cy-Ay)) - ((By-Ay)*(Cx-Ax))) ) return false;

  for (p=0;p<n;p++)
  {
    if( (p == u) || (p == v) || (p == w) ) continue;
    Px = contour[V[p]].x;
    Py = contour[V[p]].y;
    if (gfd.Triangulate.inside(Ax,Ay,Bx,By,Cx,Cy,Px,Py)) return false;
  }

  return true;
};

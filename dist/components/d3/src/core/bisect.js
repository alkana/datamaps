d3.bisector=function(e){return{left:function(t,n,r,i){arguments.length<3&&(r=0),arguments.length<4&&(i=t.length);while(r<i){var s=r+i>>>1;e.call(t,t[s],s)<n?r=s+1:i=s}return r},right:function(t,n,r,i){arguments.length<3&&(r=0),arguments.length<4&&(i=t.length);while(r<i){var s=r+i>>>1;n<e.call(t,t[s],s)?i=s:r=s+1}return r}}};var d3_bisector=d3.bisector(function(e){return e});d3.bisectLeft=d3_bisector.left,d3.bisect=d3.bisectRight=d3_bisector.right
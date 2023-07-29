'use strict';


//
// build the widget
//

const widget = new ListWidget();

const gradient = new LinearGradient()
gradient.colors = [ new Color('#000000'), new Color('#202020') ];
gradient.locations = [ 0, 1 ];
widget.backgroundGradient = gradient;

await widget.presentSmall();
Script.setWidget(widget);
Script.complete();

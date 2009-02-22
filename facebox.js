/*
 * Facebox (for jQuery)
 * version: 1.2 (05/05/2008)
 * @requires jQuery v1.2 or later
 *
 * Examples at http://famspam.com/facebox/
 *
 * Licensed under the MIT:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2007, 2008 Chris Wanstrath [ chris@ozmm.org ]
 *
 * Usage:
 *  
 *  jQuery(document).ready(function() {
 *    jQuery('a[rel*=facebox]').facebox() 
 *  })
 *
 *  <a href="#terms" rel="facebox">Terms</a>
 *    Loads the #terms div in the box
 *
 *  <a href="terms.html" rel="facebox">Terms</a>
 *    Loads the terms.html page in the box
 *
 *  <a href="terms.png" rel="facebox">Terms</a>
 *    Loads the terms.png image in the box
 *
 *
 *  You can also use it programmatically:
 * 
 *    jQuery.facebox('some html')
 *    jQuery.facebox('some html', 'my-groovy-style')
 *
 *  The above will open a facebox with "some html" as the content.
 *    
 *    jQuery.facebox(function($) { 
 *      $.get('blah.html', function(data) { $.facebox(data) })
 *    })
 *
 *  The above will show a loading screen before the passed function is called,
 *  allowing for a better ajaxy experience.
 *
 *  The facebox function can also display an ajax page, an image, or the contents of a div:
 *  
 *    jQuery.facebox({ ajax: 'remote.html' })
 *    jQuery.facebox({ ajax: 'remote.html' }, 'my-groovy-style')
 *    jQuery.facebox({ image: 'stairs.jpg' })
 *    jQuery.facebox({ images: ['stairs.jpg','ballon.jpg'] })
 *    jQuery.facebox({ images: ['stairs.jpg','ballon.jpg'], initial:'ballon.jpg'})
 *    jQuery.facebox({ image: 'stairs.jpg' }, 'my-groovy-style')
 *    jQuery.facebox({ div: '#box' })
 *    jQuery.facebox({ div: '#box' }, 'my-groovy-style')
 *
 *  Want to close the facebox?  Trigger the 'close.facebox' document event:
 *
 *    jQuery(document).trigger('close.facebox')
 *
 *  Facebox also has a bunch of other hooks:
 *
 *    loading.facebox
 *    beforeReveal.facebox
 *    reveal.facebox (aliased as 'afterReveal.facebox')
 *    init.facebox
 *
 *  Simply bind a function to any of these hooks:
 *
 *   $(document).bind('reveal.facebox', function() { ...stuff to do after the facebox and contents are revealed... })
 *
 */
(function($) {
  //TODO refactor using data.content_klass
  $.facebox = function(data, klass) {
    $.facebox.loading();
    $.facebox.content_klass = klass;
    if (data.ajax) revealAjax(data.ajax);
    else if(data.image) revealImage(data.image);
    else if(data.images) revealGallery(data.images,data.initial);
    else if(data.div) revealHref(data.div);
    else if($.isFunction(data)) data.call($);
    else $.facebox.reveal(data);
  }

  /*
   * Public, $.facebox methods
   */

  $.extend($.facebox, {
    //possible option: noAutoload --- will build facebox only when it is needed
    settings: {
      opacity      : 0,
      overlay      : true,
      modal        : false,
      imageTypes   : [ 'png', 'jpg', 'jpeg', 'gif' ]
    },

    html : function(){
      return '\
<div id="facebox" style="display:none;"> \
  <div class="popup"> \
    <table> \
      <tbody> \
        <tr> \
          <td class="tl"/><td class="b"/><td class="tr"/> \
        </tr> \
        <tr> \
          <td class="b"/> \
          <td class="body"> \
            <div class="content"> \
            </div> \
            <div class="footer"> \
              <a href="#" class="close"></a>\
            </div> \
          </td> \
          <td class="b"/> \
        </tr> \
        <tr> \
          <td class="bl"/><td class="b"/><td class="br"/> \
        </tr> \
      </tbody> \
    </table> \
  </div> \
</div>'
    },

    loading: function() {
      init();
      if($('.loading',$('#facebox'))[0]) return true;
      showOverlay();
      $.facebox.wait();
      if (!$.facebox.settings.modal) {
        $(document).bind('keydown.facebox', function(e) {
          if(e.keyCode == 27) $.facebox.close();//ESC
        });
      }
      $(document).trigger('loading.facebox');
    },

    wait: function() {
      var $f = $('#facebox');
      $('.content',$f).empty();
      $('.body',$f).children().hide().end().
        append('<div class="loading"></div>');
      $.facebox.centralize();
      $f.show();
      $(document).trigger('reveal.facebox').trigger('afterReveal.facebox');
    },

    centralize: function(){
      $('#facebox').css({
        top:	$(window).scrollTop() + ($(window).height() / 10),
        left: $(window).width() / 2 - ($('#facebox table').width() / 2)
      });
    },

    reveal: function(data){
      $(document).trigger('beforeReveal.facebox');
      var $f = $('#facebox');
      $('.content',$f).addClass($.facebox.content_klass||'');
      $('.content',$f).append(data);
      $('.loading',$f).remove();
      $('.body',$f).children().fadeIn('normal');
      $f.css('left', $(window).width() / 2 - ($('#facebox table').width() / 2));
      $(document).trigger('reveal.facebox').trigger('afterReveal.facebox');
    },

    close: function() {
      $(document).trigger('close.facebox');
      return false;
    }
  })

  /*
   * Public, $.fn methods
   */

  $.fn.facebox = function(settings) {
    if(settings)$.extend($.facebox.settings, settings);
    if(!$.facebox.settings.noAutoload) init();

    return this.bind('click.facebox',function(){
      $.facebox.loading();

      // support for rel="facebox.inline_popup" syntax, to add a class
      // also supports deprecated "facebox[.inline_popup]" syntax
      var klass = this.rel.match(/facebox\[?\.(\w+)\]?/);
      $.facebox.content_klass = klass ? klass[1] : '';
      revealHref(this.href);
      return false
    })
  }

  /*
   * Private methods
   */
  // called one time to setup facebox on this page
  function init() {
    if($.facebox.settings.inited) return;
    else $.facebox.settings.inited = true;

    $(document).trigger('init.facebox');
    makeCompatible();

    var imageTypes = $.facebox.settings.imageTypes.join('|');
    $.facebox.settings.imageTypesRegexp = new RegExp('\.(' + imageTypes + ')$', 'i');

    $('body').append($.facebox.html());
    //if we did not autoload, so the user has just clicked the facebox and pre-loading is useless
    if(! $.facebox.settings.noAutoload)preloadImages();
    $('#facebox .close').click($.facebox.close);
  }

  function preloadImages(){
    //TODO preload prev/next ?
    $('#facebox').find('.b:first, .loading, .close , .bl, .br, .tl, .tr').each(function() {
      var img = new Image();
      img.src = $(this).css('background-image').replace(/url\((.+)\)/, '$1');
    })
  }

  // Backwards compatibility
  function makeCompatible() {
    var $s = $.facebox.settings;
    $s.imageTypes = $s.image_types || $s.imageTypes;
    $s.faceboxHtml = $s.facebox_html || $s.faceboxHtml;
  }

  // Figures out what you want to display and displays it
  // formats are:
  //     div: #id
  //   image: blah.extension
  //    ajax: anything else
  function revealHref(href) {
    // div
    if(href.match(/#/)) {
      var url    = window.location.href.split('#')[0];
      var target = href.replace(url,'');
      $.facebox.reveal($(target).show().replaceWith("<div id='facebox_moved'></div>"), $.facebox.content_klass);
    // image
    } else if(href.match($.facebox.settings.imageTypesRegexp)) {
      revealImage(href);
    // ajax
    } else { revealAjax(href)}
  }

  function revealGallery(hrefs, initial) {
    //initial position
    var position=$.inArray(initial||0,hrefs);
    if(position==-1)position=0;
    
    //build navigation and ensure it will be removed
    $('#facebox div.footer').append($('<div class="navigation"><a class="prev"/><div class="counter"></div><a class="next"/></div>'));
    var $nav = $('#facebox .navigation');
    $(document).bind('afterClose.facebox',function(){$nav.remove()});

    function change_image(diff){
      position = (position + diff + hrefs.length) % hrefs.length;
      revealImage(hrefs[position]);
      $nav.find('.counter').html(position+1+" / "+hrefs.length);
    }
    change_image(0);

    //bind events
    $('.prev',$nav).click(function(){change_image(-1)});
    $('.next',$nav).click(function(){change_image(1)});
    $(document).bind('keydown.facebox', function(e) {
      if(e.keyCode == 39)change_image(1);  // right
      if(e.keyCode == 37)change_image(-1); // left
    });
  }

  function revealImage(href){
    $('#facebox .content').empty();
    $.facebox.loading();
    var image = new Image();
    image.onload = function() {
      $.facebox.reveal('<div class="image"><img src="' + image.src + '" /></div>', $.facebox.content_klass)
    }
    image.src = href;
  }

  function revealAjax(href) {
    $.get(href, function(data) { $.facebox.reveal(data) });
  }

  function skipOverlay() {
    return $.facebox.settings.overlay == false || $.facebox.settings.opacity === null
  }

  function showOverlay() {
    if(skipOverlay()) return;

    if($('#facebox_overlay').length == 0) 
      $("body").append('<div id="facebox_overlay" class="facebox_hide"></div>');

    $('#facebox_overlay').hide().addClass("facebox_overlayBG")
      .css('opacity', $.facebox.settings.opacity)
      .fadeIn(200);
    if(!$.facebox.settings.modal){
      $('#facebox_overlay').click(function(){ $(document).trigger('close.facebox')})
    }
    return false;
  }

  function hideOverlay() {
    if(skipOverlay()) return;

    $('#facebox_overlay').fadeOut(200, function(){
      $("#facebox_overlay").removeClass("facebox_overlayBG").
        addClass("facebox_hide").
        remove();
    })
    return false;
  }

  /*
   * Bindings
   */

  $(document).bind('close.facebox', function() {
    $(document).unbind('keydown.facebox');
    $('#facebox').fadeOut(function() {
      if ($('#facebox_moved').length == 0) $('#facebox .content').removeClass().addClass('content');
      else $('#facebox_moved').replaceWith($('#facebox .content').children().hide());
      hideOverlay();
      $('#facebox .loading').remove();
    })
    $(document).trigger('afterClose.facebox');
  });

})(jQuery);
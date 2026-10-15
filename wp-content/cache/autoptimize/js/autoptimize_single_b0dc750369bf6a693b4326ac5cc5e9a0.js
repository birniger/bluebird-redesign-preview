(function($){'use strict';if(!$||!window.PUM||!window.PUM.hooks){return;}
var held=[];var bannerShown=null;function readBanner(){if(document.querySelector('.cmplz-cookiebanner.cmplz-show')){return true;}
if(document.querySelector('.cmplz-cookiebanner.cmplz-dismissed')){return false;}
return null;}
function release(){bannerShown=false;held.splice(0).forEach(function(open){open();});}
function hold(autoOpen){return function(settings){var popup=this;var open=function(){autoOpen.call(popup,settings);};if(typeof window.complianz==='undefined'){return open();}
if(null===bannerShown){bannerShown=readBanner();}
if(false===bannerShown){return open();}
held.push(open);};}
window.PUM.hooks.addFilter('popupMaker.triggers',function(triggers){if(triggers&&typeof triggers.auto_open==='function'){triggers.auto_open=hold(triggers.auto_open);}
return triggers;});document.addEventListener('cmplz_cookie_warning_loaded',function(){bannerShown=readBanner();if(!bannerShown){release();}});document.addEventListener('cmplz_banner_status',function(event){if('dismissed'===event.detail){release();}else if('show'===event.detail){bannerShown=true;}});})(window.jQuery);
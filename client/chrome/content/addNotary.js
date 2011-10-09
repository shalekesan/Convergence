// Copyright (c) 2011 Moxie Marlinspike <moxie@thoughtcrime.org>

// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation; either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
// USA

Components.utils.import("resource://gre/modules/NetUtil.jsm");

function onDialogLoad() {
}

function onBrowse() {
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  var fp            = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  fp.init(window, "Select a .notary bundle", nsIFilePicker.modeOpen);
  fp.appendFilter("Notary Bundles", "*.notary");
  
  var res = fp.show();
  if (res == nsIFilePicker.returnOK){
    document.getElementById("notary-local").value = fp.file.path;
  }
}

function getTemporaryFile() {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
             .getService(Components.interfaces.nsIProperties)
             .get("TmpD", Components.interfaces.nsIFile);

  file.append("notary.tmp");
  file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);

  return file;
}

function handleLocalNotaryBundle(bundlePath) {
  var convergence = Components.classes['@thoughtcrime.org/convergence;1']
                    .getService().wrappedJSObject;

  var retvalue    = window.arguments[0];
  retvalue.notary = convergence.getNewNotaryFromBundle(bundlePath);

  return true;
};

function handleRemoteNotaryBundle(bundleUrl) {
  var ioService     = Components.classes["@mozilla.org/network/io-service;1"]  
                      .getService(Components.interfaces.nsIIOService);  
  var uri           = ioService.newURI(bundleUrl, null, null);  
  var temporaryFile = this.getTemporaryFile();      
  var wbp           = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
                      .createInstance(Components.interfaces.nsIWebBrowserPersist);
  var dialog        = document.getElementById("convergence-add-notary");
      
  wbp.progressListener = {
    onProgressChange: function(aWebProgress, aRequest, 
			       aCurSelfProgress, aMaxSelfProgress, 
			       aCurTotalProgress, aMaxTotalProgress) 
    {},
    onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
      if ((aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP)) {
	dump("Download complete, handling local notary bundle...\n");
	dialog.asyncInProgress = false;
	handleLocalNotaryBundle(temporaryFile.path);
	dialog.asyncComplete   = true;
	dialog.acceptDialog();
      }
    }
  }

  wbp.persistFlags &= ~Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_NO_CONVERSION | 
                       Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_BYPASS_CACHE;

  dialog.asyncInProgress = true;
  wbp.saveURI(uri, null, null, null, null, temporaryFile);

  return false;
};

function onDialogOK() {  
  if (document.getElementById("convergence-add-notary").asyncComplete)
    return true;

  if (document.getElementById("convergence-add-notary").asyncInProgress)
    return false;
  
  var localNotaryPath = document.getElementById("notary-local").value.replace(/^\s+|\s+$/g, "");
  var remoteNotaryUrl = document.getElementById("notary-remote").value.replace(/^\s+|\s+$/g, "");

  if (localNotaryPath.length != 0) {
    return handleLocalNotaryBundle(localNotaryPath);
  } else if (remoteNotaryUrl.length != 0) {
    return handleRemoteNotaryBundle(remoteNotaryUrl);
  } else {
    alert("Whoops, you must specify a local or remote path!");    
    return false;
  }
}


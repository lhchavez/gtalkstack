var ChatStack = {
	pushUrl: ['http://push.st/', 'http://push.st'],
	popUrl: ['http://pop.st/', 'http://pop.st'],
	isOTR: false,
	isWindow: false,
	
	install: function() {
		if(document.body.className == 'xE') {
			// single window mode
			var chat = document.getElementsByClassName('kf');
			
			if(chat.length == 0) {
				setTimeout(ChatStack.install, 1000);
				return;
			}
			
			ChatStack.isWindow = true;
			
			ChatStack.register(chat[0]);
		} else {
			// this is the root element for all the chat windows, for normal mode
			var chats = document.getElementsByClassName('no');
		
			if(chats.length == 0) {
				setTimeout(ChatStack.install, 1000);
				return;
			}
		
			chats[0].addEventListener('DOMNodeInserted', ChatStack.detectChats, true);
		}
	},
	
	detectChats: function(e) {
		// only chat logs have the role attribute set to 'log'
		if(e.target.attributes && e.target.attributes.role && e.target.attributes.role.value == 'log')
			ChatStack.register(e.target.firstChild);
	},
	
	register: function(e) {
		var content = document.createElement('div');
	
		e.stack = [];
		e.labelStack = [];
		
		var rootLabel = {label: document.createElement('div'), contents: e, chat: e};
		rootLabel.label.className = 'csLabel ko selected';
		
		rootLabel.label.appendChild(document.createTextNode('root'));
		rootLabel.label.addEventListener('click', function() {
			ChatStack.selectLabel(rootLabel);
		}, true);
		
		e.labelStack.push(rootLabel);
		
		//e.parentNode.parentNode.parentNode.insertBefore(rootLabel.label, e.parentNode.parentNode);
		if(ChatStack.isWindow)
			window.innerHeight += 16;
		
		// acting upon the complete chat history didn't go as well as expected, so
		// let's move all the nodes from the chat log to a temporary container, in
		// order to add them back, message by message.
		while(e.firstChild) {
			var child = e.firstChild;
			
			e.removeChild(child);
			content.appendChild(child);
		}
	
		// we have to traverse the chat window's history to detect old links
		while(content.firstChild) {
			var child = content.firstChild;
		
			content.removeChild(child);
			e.appendChild(child);
		
			ChatStack.interceptLinks(child);
		}
	
		// we have to let the DOM finish inserting all the node's children to be
		// able to detect the other person's links correctly. Also avoids some
		// timing issues where the magic links are linkefied before displaying them
		// on the screen.
		e.addEventListener('DOMNodeInserted', function(x) {
			setTimeout(function() { ChatStack.interceptLinks(x.target); }, 100);
		}, true);
	},
	
	interceptLinks: function(link) {
		if(link.nodeName == 'A') {
			// avoids double action on links. haven't seen it, but it's possible
			// under some scenarios.
			if(link.chatStackMangled) return;
			link.chatStackMangled = true;
			
			if(ChatStack.pushUrl.indexOf(link.href) != -1) {
				ChatStack.push(link);
			} else if(ChatStack.popUrl.indexOf(link.href) != -1) {
				ChatStack.pop(link);
			}
		} else if (link.getElementsByTagName) {
			// first check if it is an OTR message
			if(link.className == 'kq') {
				// this is a "system message"
				if(link.innerHTML.indexOf('answer=29291') != -1) {
					// OTR
					ChatStack.isOTR = true;
					ChatStack.push(link);
				} else if(link.innerHTML.indexOf('no longer') != -1) {
					// not OTR
					ChatStack.pop(link);
					ChatStack.isOTR = false;
				}
			} else {
				// if gtalk was too quick and linkefied all the urls BEFORE adding them
				// to the DOM tree, let's detect links within messages.
				var links = link.getElementsByTagName('a');
			
				for(i = 0; i < links.length; i++) {
					ChatStack.interceptLinks(links[i]);
				}
			}
		}
	},
	
	getChat: function(node) {
		while(node && !node.stack) node = node.parentNode;
		return node;
	},
	
	getMessage: function(node) {
		// fixed a bug that only happens in *some* computers. weird.
		while(node && !(node.attributes && node.attributes.role && node.attributes.role.nodeValue == 'chatMessage'))
			node = node.parentNode;
		return node;
	},
	
	addClass: function(node, className) {
		if(node.className.indexOf(className) == -1) {
			if(node.className.length == 0) node.className = className;
			else node.className += ' ' + className;
		}
	},
	
	removeClass: function(node, className) {
		if(node.className.indexOf(className) != -1) {
			node.className = node.className
				.replace(className, '')
				.replace(/ +/g, " ")
				.replace(/^ /, "")
				.replace(/ $/, "");
		}
	},
	
	replaceClass: function(node, before, after) {
		ChatStack.removeClass(node, before);
		ChatStack.addClass(node, after);
	},
	
	selectLabel: function(label) {
		console.log(label);
		console.log(label.chat.labelStack);
		if(label.contents.style.display == '') {
			// it is already selected. nothing to do here.
			return;
		}
		
		for(i = 0; i < label.chat.labelStack.length; i++) {
			ChatStack.removeClass(label.chat.labelStack[i].label, 'selected');
			label.chat.labelStack[i].contents.style.display = 'none';
		}
		
		ChatStack.addClass(label.label, 'selected');
		label.contents.style.display = '';
	},
	
	push: function(node) {
		var chat = ChatStack.getChat(node);
		var context = "";
		
		// deactivate interception while we are mangling with the DOM. don't want
		// a link to activate while we are popping it back.
		if(!chat || chat.cancelInterception) return;
		chat.cancelInterception = true;
		
		if(node.previousSibling && node.previousSibling.nodeValue) {
			context = node.previousSibling.nodeValue.replace(/^\s+|\s+$/g,"");
		}
		if(ChatStack.isOTR) {
			context += ' (OTR)';
		}
		
		var oldContents = document.createElement('div');
		var msg = ChatStack.getMessage(node);
		
		while(chat.firstChild && chat.firstChild != msg) {
			var child = chat.firstChild;
			chat.removeChild(child);
			oldContents.appendChild(child);
		}
		
		oldContents.style.display = 'none';
		oldContents.className = 'ko oldContent';
		chat.stack.push(oldContents);
		
		var label = {label: document.createElement('div'), contents: chat, chat: chat};
		label.label.appendChild(document.createTextNode(context));
		label.label.className = 'csLabel ko';
		if(ChatStack.isOTR) {
			ChatStack.addClass(label.label, 'otr');
		}
		
		label.label.addEventListener('click', function() {
			ChatStack.selectLabel(label);
		}, true);
		
		console.log(chat.labelStack);
		chat.labelStack[chat.labelStack.length - 1].contents = oldContents;
		chat.labelStack.push(label);
		
		chat.parentNode.parentNode.parentNode.insertBefore(oldContents, chat.parentNode.parentNode);
		//chat.parentNode.parentNode.parentNode.insertBefore(label.label, chat.parentNode.parentNode);
		
		if(ChatStack.isWindow)
			window.innerHeight += 30;
			
		//ChatStack.selectLabel(label);
		
		chat.cancelInterception = false;
	},
	
	pop: function(node) {
		var chat = ChatStack.getChat(node);
		
		// deactivate interception while we are mangling with the DOM. don't want
		// a link to activate while we are popping it back.
		if(!chat || chat.stack.length == 0 || chat.cancelInterception) return;
		chat.cancelInterception = true;
		
		var oldContents = chat.stack.pop();
		var newContents = document.createElement('div');
		var msg = ChatStack.getMessage(node);
		
		while(chat.firstChild && chat.firstChild != msg) {
			var child = chat.firstChild;
			chat.removeChild(child);
			newContents.appendChild(child);
		}
		
		while(oldContents.firstChild) {
			var child = oldContents.firstChild;
			oldContents.removeChild(child);
			chat.insertBefore(child, msg);
		}
		
		var label = chat.labelStack.pop();
		
		if(newContents.children.length != 0) {
			// only insert an awesome-looking collapsed version of the pushed context
			// if it actually has anything. i.e. if the push and pop commands are on
			// the same chat block, it isn't worth collapsing an empty block.
			
			var stackContainer = document.createElement('div');
			stackContainer.className = 'stackContainer';
		
			var toggleLink = document.createElement('div');
			toggleLink.appendChild(document.createTextNode(label.label.firstChild.nodeValue));
			toggleLink.isOTR = ChatStack.isOTR;
			toggleLink.className = 'toggle expand';
			
			if(toggleLink.isOTR) {
				ChatStack.addClass(toggleLink, 'otr');
			}
			
			toggleLink.addEventListener('click', function() {
				if(newContents.style.display == 'none') {
					newContents.style.display = '';
					ChatStack.replaceClass(toggleLink, 'expand', 'collapse');
				} else {
					newContents.style.display = 'none';
					ChatStack.replaceClass(toggleLink, 'collapse', 'expand');
				}
			}, true);
		
			stackContainer.appendChild(toggleLink);
			newContents.className = 'nested';
			newContents.style.display = 'none';
			stackContainer.appendChild(newContents);
		
			chat.insertBefore(stackContainer, msg);
		}
		
		//label.label.parentNode.removeChild(label.label);
		
		var oldContents = chat.labelStack[chat.labelStack.length - 1].contents;
		oldContents.parentNode.removeChild(oldContents);
		chat.labelStack[chat.labelStack.length - 1].contents = chat;
		
		if(ChatStack.isWindow)
			window.innerHeight -= 30;
		
		chat.cancelInterception = false;
	}
};

ChatStack.install();

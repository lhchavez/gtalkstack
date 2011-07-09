var ChatStack = {
	pushUrl: ['http://push.st/', 'http://push.st'],
	popUrl: ['http://pop.st/', 'http://pop.st'],
	
	install: function() {
		if(document.body.className == 'xE') {
			// single window mode
			var chat = document.getElementsByClassName('kf');
			
			if(chat.length == 0) {
				setTimeout(ChatStack.install, 1000);
				return;
			}
			
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
			// if gtalk was too quick and linkefied all the urls BEFORE adding them
			// to the DOM tree, let's detect links within messages.
			var links = link.getElementsByTagName('a');
			
			for(i = 0; i < links.length; i++) {
				ChatStack.interceptLinks(links[i]);
			}
		}
	},
	
	getChat: function(node) {
		while(node && !node.stack) node = node.parentNode;
		return node;
	},
	
	getMessage: function(node) {
		while(node && !(node.attributes.role && node.attributes.role.nodeValue == 'chatMessage'))
			node = node.parentNode;
		return node;
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
		
		var oldContents = document.createElement('div');
		var msg = ChatStack.getMessage(node);
		
		while(chat.firstChild && chat.firstChild != msg) {
			var child = chat.firstChild;
			chat.removeChild(child);
			oldContents.appendChild(child);
		}
		
		chat.stack.push(oldContents);
		
		var label = document.createElement('div');
		label.appendChild(document.createTextNode(context));
		
		chat.labelStack.push(label);
		
		// TODO: make the label display the content that was there before the push
		chat.parentNode.parentNode.parentNode.insertBefore(label, chat.parentNode.parentNode);
		
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
			toggleLink.appendChild(document.createTextNode(label.firstChild.nodeValue));
			toggleLink.className = 'toggle expand';
			toggleLink.addEventListener('click', function() {
				if(newContents.style.display == 'none') {
					newContents.style.display = '';
					toggleLink.className = 'toggle collapse';
				} else {
					newContents.style.display = 'none';
					toggleLink.className = 'toggle expand';
				}
			}, true);
		
			stackContainer.appendChild(toggleLink);
			newContents.className = 'nested';
			newContents.style.display = 'none';
			stackContainer.appendChild(newContents);
		
			chat.insertBefore(stackContainer, msg);
		}
		
		label.parentNode.removeChild(label);
		
		chat.cancelInterception = false;
	}
};

ChatStack.install();

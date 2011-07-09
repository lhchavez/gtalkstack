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
		
			chats = chats[0];
		
			// <dev>
			// only for dev purposes, will remove once it is stable
			if(ChatStack.oldinsert) {
				chats.removeEventListener('DOMNodeInserted', ChatStack.oldinsert, true);
			}
			ChatStack.oldinsert = ChatStack.detectChats;
			// </dev>
		
			chats.addEventListener('DOMNodeInserted', ChatStack.detectChats, true);
		}
	},
	
	detectChats: function(e) {
		// only chat logs have the role attribute set to 'log'
		if(e.target.attributes && e.target.attributes.role && e.target.attributes.role.value == 'log')
			ChatStack.register(e.target.firstChild);
	},
	
	register: function(e) {
		var content = document.createElement('div');
		
		console.log('registered');
		console.log(e);
	
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
			
			for(j = 0; j < ChatStack.pushUrl.length; j++) {
				if(link.href == ChatStack.pushUrl[j]) {
					ChatStack.push(link, false);
				} else if(link.href == ChatStack.popUrl[j]) {
					ChatStack.pop(link, false);
				}
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
	
	push: function(node, bulk) {
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
		chat.parentNode.appendChild(label);
		
		chat.cancelInterception = false;
	},
	
	pop: function(node, bulk) {
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
		
		if(newContents.children.length == 0) {
			// and nothing of value was lost
			// i.e. the push and pop were on the same chat block
			return;
		}
		
		while(oldContents.firstChild) {
			var child = oldContents.firstChild;
			oldContents.removeChild(child);
			chat.insertBefore(child, msg);
		}
		
		var label = chat.labelStack.pop();
		
		var stackContainer = document.createElement('div');
		stackContainer.style.borderColor = '#ccc';
		stackContainer.style.borderWidth = '1px 0 1px 0';
		stackContainer.style.borderStyle = 'solid';
		
		var toggleLink = document.createElement('div');
		toggleLink.appendChild(document.createTextNode('> ' + label.firstChild.nodeValue));
		toggleLink.style.decoration = 'underline';
		toggleLink.style.color = '#00f';
		toggleLink.addEventListener('click', function() {
			if(newContents.style.display == 'none') {
				newContents.style.display = '';
			} else {
				newContents.style.display = 'none';
			}
		}, true);
		
		stackContainer.appendChild(toggleLink);
		newContents.style.display = 'none';
		newContents.style.padding = '0 0 0 25px';
		stackContainer.appendChild(newContents);
		
		chat.insertBefore(stackContainer, msg);
		
		label.parentNode.removeChild(label);
		
		chat.cancelInterception = false;
	}
};

ChatStack.install();

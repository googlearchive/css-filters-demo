#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import cgi
import datetime
import urllib
import wsgiref.handlers

import os
import re
import hashlib

from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.api.logservice import RequestLog


class Artwork(db.Model):
  """An artwork with a creation date."""
  version = db.IntegerProperty(required=True)
  data = db.TextProperty(required=True)
  date = db.DateTimeProperty(auto_now_add=True)

  
  
class MainPage(webapp.RequestHandler):
    def get(self):
        template_values = {
        }

        path = os.path.join(os.path.dirname(__file__), 'index.html')
        self.response.out.write(template.render(path, template_values))



class RPCHandler(webapp.RequestHandler):
	def post(self):
		action = self.request.get('action')
		referer = self.request.referer
		if action == 'save':
			# Store json string return id
			artwork = Artwork(version=int(self.request.get('version')), data=self.request.get('data'))
			id = artwork.put().id()
			if artwork.put():
				self.response.headers['Content-Type'] = 'application/json'
				self.response.out.write('{"id":' + str(id) + '}')
				self.response.set_status(200)
			else:
				self.response.set_status(409)
				
		elif action == 'load':
			id = self.request.get('id')
			# Load the given id from data store
			artwork = Artwork.get_by_id(int(id))
			if artwork:
				json = artwork.data
				self.response.headers['Content-Type'] = 'application/json'
				self.response.out.write(json)
			else:
				self.response.out.write('sorry that id does not exist')
				self.response.set_status(409)
		else:
			self.response.set_status(409)
			


application = webapp.WSGIApplication(
                                     [('/', MainPage),
                                      ('/r', RPCHandler)
                                      ],
                                     debug=True)

def main():
	run_wsgi_app(application)

if __name__ == "__main__":
    main()
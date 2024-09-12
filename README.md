1. GET: Authorization Endpoint
Endpoint: http://localhost:3000/auth
•	Method: GET
•	Description: This endpoint is used for QuickBooks authentication and initiating the OAuth flow.
•	Headers: None
•	Request Body: Not applicable
•	Response: This initiates the QuickBooks OAuth flow, and it should redirect to the authorization URL.
________________________________________
2. POST: File Upload Endpoint
Endpoint: http://localhost:3000/upload
•	Method: POST
•	Description: This endpoint is used for uploading a file, specifically a CSV file in this case.
•	Headers: None
•	Request Body:
o	Type: formdata
o	File:
	file: Path to the file (c:\\Users\\Aizaz\\Desktop\\file.csv).
•	Response: Expected to handle the uploaded file and return success/failure status.
________________________________________
3. GET: Accounts Endpoint
Endpoint: http://localhost:3000/accounts
•	Method: GET
•	Description: This endpoint is used to retrieve all accounts (bank and credit card types) associated with the selected QuickBooks data file.
•	Query Parameters:
o	dataFile: The name of the data file, e.g., Sandbox Company_US_1
•	Headers:
o	Authorization: The authorization token. This is in JWT format and should be prefixed by Bearer.
o	Example: Bearer eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...
o	refreshToken: A token used to refresh the QuickBooks session.
•	Response: Returns a list of accounts for the specified data file.
________________________________________
4. POST: Data Files Endpoint
Endpoint: http://localhost:3000/datafiles
•	Method: POST
•	Description: This endpoint retrieves the list of QuickBooks data files connected via the QuickBooks Web Connector.
•	Headers:
o	Authorization: The bearer token for authentication.
o	realmid: The realm ID for the QuickBooks account, e.g., 9341452907407238.
•	Request Body: None
•	Response: Returns a list of connected data files.
________________________________________
5. POST: Categories Endpoint
Endpoint: http://localhost:3000/categories
•	Method: POST
•	Description: This endpoint retrieves all categories (income and expense account types) for the selected QuickBooks data file.
•	Headers:
o	Authorization: The bearer token for authentication.
o	realmid: The realm ID for the QuickBooks account, e.g., 9341452907407238.
•	Request Body:
o	Type: JSON
o	Example:
{
  "dataFiles": "Sandbox Company_US_1"
}
•	Response: Returns a list of categories for the specified data file.


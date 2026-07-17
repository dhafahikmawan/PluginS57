endpoint: http://localhost:3000/s57-geojson
method: POST

form-data:


Key: "file"
Value: the S-57 (.000) file




Testing:
testing input file: ""../S57/ID1N0364.000"
expected received geojson: ""./Result.geojson"

can try testing it (curl, ...) first to see if the endpoint is working
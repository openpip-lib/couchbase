#couchbase-lib
Couchbase API for documents.

### Usage

Requires Node v4.0+

#### Couchbase-lib example

```javascript
const couchbase = require('@vidaxl/couchbase-lib').getInstance({
    host: 'localhost',
    port: 8091,
    username: 'example',
    password: 'example',
    bucket: 'example'
});
```
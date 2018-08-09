const id = require('../src/id');
const { assert } = require('chai');

describe('id', () => {
    it('should generate a id', () => {
        let someId = id.generate();
        assert.isNotEmpty(someId);
        assert.lengthOf(someId, 25);
    });
});
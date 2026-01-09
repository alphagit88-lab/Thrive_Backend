/**
 * Locations Routes
 * /api/locations
 */

const express = require('express');
const router = express.Router();
const {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../controllers/locations.controller');

// Routes
router.route('/')
  .get(getLocations)
  .post(createLocation);

router.route('/:id')
  .get(getLocation)
  .put(updateLocation)
  .delete(deleteLocation);

module.exports = router;


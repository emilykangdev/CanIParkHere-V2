"""
Validation tests for models/requests.py request models.
"""

import pytest
from pydantic import ValidationError

from models.requests import ParkingSearchRequest, LocationCheckRequest, FollowUpRequest


class TestParkingSearchRequest:
    def test_valid_request_accepted(self):
        req = ParkingSearchRequest(latitude=47.6062, longitude=-122.3321, radius_meters=200)
        assert req.latitude == 47.6062
        assert req.longitude == -122.3321
        assert req.radius_meters == 200

    def test_default_radius_applied(self):
        req = ParkingSearchRequest(latitude=47.6062, longitude=-122.3321)
        assert req.radius_meters == 100

    @pytest.mark.parametrize("lat", [90.1, -90.1, 1000, -1000])
    def test_latitude_out_of_range_rejected(self, lat):
        with pytest.raises(ValidationError):
            ParkingSearchRequest(latitude=lat, longitude=-122.3321)

    @pytest.mark.parametrize("lon", [180.1, -180.1, 1000, -1000])
    def test_longitude_out_of_range_rejected(self, lon):
        with pytest.raises(ValidationError):
            ParkingSearchRequest(latitude=47.6062, longitude=lon)

    @pytest.mark.parametrize("lat,lon", [(90, 180), (-90, -180), (0, 0)])
    def test_boundary_lat_lon_accepted(self, lat, lon):
        req = ParkingSearchRequest(latitude=lat, longitude=lon)
        assert req.latitude == lat
        assert req.longitude == lon

    @pytest.mark.parametrize("radius", [9, 0, -5, 5001, 100000])
    def test_radius_out_of_bounds_rejected(self, radius):
        with pytest.raises(ValidationError):
            ParkingSearchRequest(latitude=47.6062, longitude=-122.3321, radius_meters=radius)

    @pytest.mark.parametrize("radius", [10, 5000, 2500])
    def test_radius_within_bounds_accepted(self, radius):
        req = ParkingSearchRequest(latitude=47.6062, longitude=-122.3321, radius_meters=radius)
        assert req.radius_meters == radius


class TestLocationCheckRequest:
    def test_valid_request_accepted(self):
        req = LocationCheckRequest(latitude=47.6062, longitude=-122.3321)
        assert req.datetime is None

    @pytest.mark.parametrize("lat", [90.5, -91])
    def test_latitude_out_of_range_rejected(self, lat):
        with pytest.raises(ValidationError):
            LocationCheckRequest(latitude=lat, longitude=-122.3321)

    @pytest.mark.parametrize("lon", [180.5, -181])
    def test_longitude_out_of_range_rejected(self, lon):
        with pytest.raises(ValidationError):
            LocationCheckRequest(latitude=47.6062, longitude=lon)

    def test_valid_iso_datetime_accepted(self):
        req = LocationCheckRequest(latitude=47.6062, longitude=-122.3321, datetime="2026-08-17T12:00:00Z")
        assert req.datetime == "2026-08-17T12:00:00Z"

    def test_invalid_datetime_rejected(self):
        with pytest.raises(ValidationError):
            LocationCheckRequest(latitude=47.6062, longitude=-122.3321, datetime="not-a-real-datetime")


class TestFollowUpRequest:
    def test_valid_request_accepted(self):
        req = FollowUpRequest(session_id="abc-123", question="Can I park here after 6pm?")
        assert req.question == "Can I park here after 6pm?"

    def test_empty_session_id_rejected(self):
        with pytest.raises(ValidationError):
            FollowUpRequest(session_id="", question="Can I park here?")

    def test_empty_question_rejected(self):
        with pytest.raises(ValidationError):
            FollowUpRequest(session_id="abc-123", question="")

    def test_whitespace_only_question_rejected(self):
        with pytest.raises(ValidationError):
            FollowUpRequest(session_id="abc-123", question="    ")

    def test_question_over_max_length_rejected(self):
        with pytest.raises(ValidationError):
            FollowUpRequest(session_id="abc-123", question="x" * 501)

    def test_question_at_max_length_accepted(self):
        req = FollowUpRequest(session_id="abc-123", question="x" * 500)
        assert len(req.question) == 500

    def test_question_is_stripped(self):
        req = FollowUpRequest(session_id="abc-123", question="  Can I park here?  ")
        assert req.question == "Can I park here?"

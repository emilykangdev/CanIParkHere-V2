"""
Tests for geo/spatial_query_api.py:
  - Athena queries use `?` ExecutionParameters instead of interpolating
    numeric values into the SQL text (mocked boto3 Athena client only --
    NOT verified against a real Athena endpoint).
  - `_validate_lat_lon` range/swap heuristics.

Fully offline: athena_client is a MagicMock, no network calls occur.
"""

from unittest.mock import MagicMock

import pytest

from geo.spatial_query_api import get_signs_nearby, public_parking_nearby, _validate_lat_lon


def _fake_query_result(columns, row_values):
    """Build a minimal Athena get_query_results-shaped response."""
    return {
        "ResultSet": {
            "ResultSetMetadata": {"ColumnInfo": [{"Label": c} for c in columns]},
            "Rows": [
                {"Data": [{"VarCharValue": c} for c in columns]},  # header row (skipped)
                {"Data": [{"VarCharValue": str(v)} for v in row_values]},
            ],
        }
    }


def _mock_athena_client(columns, row_values):
    client = MagicMock(name="athena_client")
    client.start_query_execution.return_value = {"QueryExecutionId": "exec-123"}
    client.get_query_execution.return_value = {
        "QueryExecution": {"Status": {"State": "SUCCEEDED"}}
    }
    client.get_query_results.return_value = _fake_query_result(columns, row_values)
    return client


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("AWS_DB_SIG", "sig_db")
    monkeypatch.setenv("AWS_TABLE_SIG", "sig_table")
    monkeypatch.setenv("AWS_DB_PUB", "pub_db")
    monkeypatch.setenv("AWS_TABLE_PUB", "pub_table")
    monkeypatch.setenv("AWS_ATHENA_OUTPUT", "s3://fake-bucket/output/")


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    # Defensive: query completes on the first poll in these tests, so
    # time.sleep should never actually be called, but stub it out anyway.
    import geo.spatial_query_api as spatial_query_api
    monkeypatch.setattr(spatial_query_api.time, "sleep", lambda *_: None)


class TestGetSignsNearby:
    def test_uses_execution_parameters_not_interpolated_values(self):
        athena_client = _mock_athena_client(
            columns=["shape_lat", "shape_lng", "distance_m"],
            row_values=[47.6062, -122.3321, 12.5],
        )
        log = MagicMock()

        lat, lon, radius_meters, top_n = 47.6062, -122.3321, 250, 15
        get_signs_nearby(
            lat=lat, lon=lon, athena_client=athena_client, log=log,
            radius_meters=radius_meters, top_n=top_n,
        )

        athena_client.start_query_execution.assert_called_once()
        call_kwargs = athena_client.start_query_execution.call_args.kwargs
        query_string = call_kwargs["QueryString"]

        # Numeric values must be bound as parameters, not spliced into SQL text.
        assert "ST_Point(?, ?)" in query_string
        assert f"{lat}" not in query_string
        assert f"{lon}" not in query_string
        assert f"<= {radius_meters}" not in query_string
        assert f"LIMIT {top_n}" not in query_string

        assert call_kwargs["ExecutionParameters"] == [
            str(lon), str(lat), str(radius_meters), str(top_n)
        ]

        # Identifiers (db/table names) still come from env vars via the query text.
        assert '"sig_db"."sig_table"' in query_string

    def test_returns_normalized_rows(self):
        athena_client = _mock_athena_client(
            columns=["shape_lat", "shape_lng", "distance_m"],
            row_values=[47.6062, -122.3321, 12.5],
        )
        results = get_signs_nearby(
            lat=47.6062, lon=-122.3321, athena_client=athena_client, log=MagicMock(),
        )
        assert len(results) == 1
        assert results[0]["lat"] == pytest.approx(47.6062)
        assert results[0]["lng"] == pytest.approx(-122.3321)

    def test_raises_when_query_fails(self):
        athena_client = MagicMock(name="athena_client")
        athena_client.start_query_execution.return_value = {"QueryExecutionId": "exec-123"}
        athena_client.get_query_execution.return_value = {
            "QueryExecution": {"Status": {"State": "FAILED"}}
        }
        with pytest.raises(RuntimeError):
            get_signs_nearby(
                lat=47.6062, lon=-122.3321, athena_client=athena_client, log=MagicMock(),
            )


class TestPublicParkingNearby:
    def test_uses_execution_parameters_not_interpolated_values(self):
        athena_client = _mock_athena_client(
            columns=["lat", "lng", "distance_m"],
            row_values=[47.6062, -122.3321, 30.0],
        )
        log = MagicMock()

        lat, lon, radius_meters, top_n = 47.6062, -122.3321, 100, 20
        public_parking_nearby(
            lat=lat, lon=lon, athena_client=athena_client, log=log,
            radius_meters=radius_meters, top_n=top_n,
        )

        athena_client.start_query_execution.assert_called_once()
        call_kwargs = athena_client.start_query_execution.call_args.kwargs
        query_string = call_kwargs["QueryString"]

        assert "ST_Point(?, ?)" in query_string
        assert f"{lat}" not in query_string
        assert f"{lon}" not in query_string
        assert f"<= {radius_meters}" not in query_string
        assert f"LIMIT {top_n}" not in query_string

        assert call_kwargs["ExecutionParameters"] == [
            str(lon), str(lat), str(radius_meters), str(top_n)
        ]

        assert '"pub_db"."pub_table"' in query_string

    def test_invalid_lat_lon_rejected_before_querying(self):
        athena_client = MagicMock(name="athena_client")
        with pytest.raises(ValueError):
            public_parking_nearby(
                lat=999, lon=-122.3321, athena_client=athena_client, log=MagicMock(),
            )
        athena_client.start_query_execution.assert_not_called()


class TestValidateLatLon:
    @pytest.mark.parametrize("lat,lon", [
        (47.6062, -122.3321),
        (0, 0),
        (90, 180),
        (-90, -180),
    ])
    def test_valid_lat_lon_does_not_raise(self, lat, lon):
        _validate_lat_lon(lat, lon)  # should not raise

    @pytest.mark.parametrize("lat,lon", [
        (90.1, -122.3321),
        (-90.1, -122.3321),
        (1000, -122.3321),
    ])
    def test_latitude_out_of_range_raises(self, lat, lon):
        with pytest.raises(ValueError):
            _validate_lat_lon(lat, lon)

    @pytest.mark.parametrize("lat,lon", [
        (47.6062, 180.1),
        (47.6062, -180.1),
        (47.6062, 1000),
    ])
    def test_longitude_out_of_range_raises(self, lat, lon):
        with pytest.raises(ValueError):
            _validate_lat_lon(lat, lon)

    def test_swapped_lat_lon_raises(self):
        # Seattle is roughly (47.6, -122.3). Swapped, lat=-122.3 is already
        # out of the [-90, 90] range, so this is caught by the first range
        # check in the current implementation (the second "swap" branch is
        # unreachable given the first check -- documented here as-is).
        with pytest.raises(ValueError):
            _validate_lat_lon(lat=-122.3321, lon=47.6062)

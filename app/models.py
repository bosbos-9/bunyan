"""
Domain models for milestone-based escrow.

Investor returns are calculated at the project level (not per milestone):
funds return only when every milestone is verified AND total spend is under budget.
"""

from dataclasses import dataclass, field
from datetime import date
from enum import Enum


class ApprovalRole(str, Enum):
    ENGINEER = "engineer"
    REGA_INSPECTOR = "rega_inspector"
    TRUSTEE = "trustee"


ALL_ROLES = [role.value for role in ApprovalRole]


@dataclass
class Milestone:
    name: str
    expected_completion_date: date
    budget_percentage: float
    submitted: bool = False
    actual_cost: float | None = None
    approvals: dict[str, bool] = field(
        default_factory=lambda: {role: False for role in ALL_ROLES}
    )  

    @property
    def is_verified(self) -> bool:
        return self.submitted and all(self.approvals.values())
    #calculate the allocated amount for a milestone
    def allocated_amount(self, total_budget: float) -> float:
        return total_budget * (self.budget_percentage / 100.0)

    #convert the milestone to a dictionary for display in the UI
    def to_dict(self, total_budget: float) -> dict:
        allocated = self.allocated_amount(total_budget)
        return {
            "name": self.name,
            "expected_completion_date": self.expected_completion_date.isoformat(),
            "budget_percentage": self.budget_percentage,
            "allocated_amount": allocated,
            "submitted": self.submitted,
            "actual_cost": self.actual_cost,
            "approvals": dict(self.approvals),
            "is_verified": self.is_verified,
        
        }


@dataclass
class Project:
    name: str
    total_budget: float
    milestones: list[Milestone] = field(default_factory=list)

    def released_amount(self) -> float:
        # Sum of actual costs for verified milestones.
        return sum(
            m.actual_cost or 0.0
            for m in self.milestones
            if m.is_verified
        )

    def returned_amount(self) -> float:
        if not self.is_complete:
            return 0.0
        return max(0.0, self.total_budget - self.released_amount())

    def deficit_amount(self) -> float:
        if not self.is_complete:
            return 0.0
        return max(0.0, self.released_amount() - self.total_budget)

    @property
    def is_over_budget(self) -> bool:
        return self.is_complete and self.deficit_amount() > 0

    def escrow_amount(self) -> float:
        """Budget still allocated to unverified milestones."""
        if self.is_complete:
            return 0.0
        return sum(
            m.allocated_amount(self.total_budget)
            for m in self.milestones
            if not m.is_verified
        )

    @property
    def verified_count(self) -> int:
        return sum(1 for m in self.milestones if m.is_verified)

    @property
    def is_complete(self) -> bool:
        return bool(self.milestones) and all(m.is_verified for m in self.milestones)

    def pie_segments(self) -> list[dict]:
        segments: list[dict] = []

        for milestone in self.milestones:
            if milestone.is_verified:
                segments.append(
                    {
                        "label": milestone.name,
                        "value": milestone.actual_cost or 0.0,
                        "type": "released",
                    }
                )
            elif milestone.submitted:
                segments.append(
                    {
                        "label": f"{milestone.name} (pending approval)",
                        "value": milestone.actual_cost or 0.0,
                        "type": "pending",
                    }
                )

        if self.is_complete:
            returned = self.returned_amount()
            if returned > 0:
                segments.append(
                    {
                        "label": "Returned to investors",
                        "value": returned,
                        "type": "returned",
                    }
                )
            deficit = self.deficit_amount()
            if deficit > 0:
                segments.append(
                    {
                        "label": "Over budget (deficit)",
                        "value": deficit,
                        "type": "deficit",
                    }
                )
        else:
            for milestone in self.milestones:
                if not milestone.is_verified and not milestone.submitted:
                    segments.append(
                        {
                            "label": f"{milestone.name} (planned)",
                            "value": milestone.allocated_amount(self.total_budget),
                            "type": "planned",
                        }
                    )

        return segments

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "total_budget": self.total_budget,
            "total_raised": self.total_budget,
            "total_released": self.released_amount(),
            "total_returned": self.returned_amount(),
            "total_deficit": self.deficit_amount(),
            "total_escrow": self.escrow_amount(),
            "is_complete": self.is_complete,
            "is_over_budget": self.is_over_budget,
            "milestones_verified": self.verified_count,
            "milestones_total": len(self.milestones),
            "pie_segments": self.pie_segments(),
            "milestones": [m.to_dict(self.total_budget) for m in self.milestones],
        }
